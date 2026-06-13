import webpush from "web-push";
import { prisma } from "./prisma";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

if (publicKey && privateKey) {
  webpush.setVapidDetails("mailto:esteban@sytrex.io", publicKey, privateKey);
}

export type PushPayload = { title: string; body: string; url?: string };

/** Envía a todas las suscripciones de un usuario; limpia las muertas. */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!publicKey || !privateKey) return 0;
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      );
      sent++;
    } catch (e: unknown) {
      const status = (e as { statusCode?: number }).statusCode;
      // suscripción expirada o revocada
      if (status === 404 || status === 410) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      }
    }
  }
  return sent;
}

/**
 * Recordatorio: a cada usuario suscrito con pronósticos faltantes para los
 * partidos de las próximas `hoursAhead` horas.
 */
export async function sendPredictionReminders(hoursAhead = 24) {
  const now = new Date();
  const until = new Date(now.getTime() + hoursAhead * 3600 * 1000);

  const upcoming = await prisma.match.findMany({
    where: {
      kickoff: { gt: now, lte: until },
      homeTeamId: { not: null },
      awayTeamId: { not: null },
    },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { kickoff: "asc" },
  });
  if (!upcoming.length) return { users: 0, sent: 0 };

  const users = await prisma.user.findMany({
    where: { pushSubscriptions: { some: {} } },
    include: { predictions: { select: { matchId: true } } },
  });

  let notified = 0;
  let sent = 0;
  for (const user of users) {
    const done = new Set(user.predictions.map((p) => p.matchId));
    const missing = upcoming.filter((m) => !done.has(m.id));
    if (!missing.length) continue;

    const first = missing[0];
    const body =
      missing.length === 1
        ? `${first.homeTeam!.name} vs ${first.awayTeam!.name} arranca pronto y no has puesto tu marcador.`
        : `Te faltan ${missing.length} pronósticos para los partidos de hoy. El primero: ${first.homeTeam!.name} vs ${first.awayTeam!.name}.`;

    sent += await sendPushToUser(user.id, {
      title: "⚽ ¡Llena tu polla!",
      body,
      url: "/?vista=fecha#hoy",
    });
    notified++;
  }
  return { users: notified, sent };
}
