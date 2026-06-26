"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { updateBracket } from "@/lib/knockout";
import { syncResults } from "@/lib/sync";
import { sendPredictionReminders } from "@/lib/push";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) throw new Error("Solo admin");
  return user;
}

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/tabla");
  revalidatePath("/premios");
  revalidatePath("/admin");
  revalidatePath("/admin/pronosticos");
}

/** El admin corrige (o crea/borra) el pronóstico de cualquier jugador. */
export async function adminSavePrediction(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const matchId = Number(formData.get("matchId"));
  const rawHome = String(formData.get("homeScore") ?? "").trim();
  const rawAway = String(formData.get("awayScore") ?? "").trim();
  if (!userId || !Number.isInteger(matchId)) return { error: "Datos inválidos" };

  // ambos vacíos = borrar el pronóstico
  if (rawHome === "" && rawAway === "") {
    await prisma.prediction.deleteMany({ where: { userId, matchId } });
    revalidateAll();
    return { ok: true, deleted: true };
  }

  const h = Number(rawHome);
  const a = Number(rawAway);
  if (![h, a].every((n) => Number.isInteger(n) && n >= 0 && n <= 99)) {
    return { error: "Marcador inválido" };
  }

  await prisma.prediction.upsert({
    where: { userId_matchId: { userId, matchId } },
    update: { homeScore: h, awayScore: a },
    create: { userId, matchId, homeScore: h, awayScore: a },
  });
  revalidateAll();
  return { ok: true };
}

export async function saveResult(formData: FormData) {
  await requireAdmin();
  const matchId = Number(formData.get("matchId"));
  const rawHome = String(formData.get("homeScore") ?? "").trim();
  const rawAway = String(formData.get("awayScore") ?? "").trim();
  const winnerId = String(formData.get("winnerId") ?? "").trim() || null;

  // vacío = borrar resultado
  const homeScore = rawHome === "" ? null : Number(rawHome);
  const awayScore = rawAway === "" ? null : Number(rawAway);

  await prisma.match.update({
    where: { id: matchId },
    data: { homeScore, awayScore, winnerId },
  });
  await updateBracket();
  revalidateAll();
}

export async function saveKickoff(formData: FormData) {
  await requireAdmin();
  const matchId = Number(formData.get("matchId"));
  const kickoff = String(formData.get("kickoff") ?? "");
  if (!kickoff) return;
  // el input datetime-local viene sin zona; se interpreta como UTC
  await prisma.match.update({
    where: { id: matchId },
    data: { kickoff: new Date(`${kickoff}:00Z`) },
  });
  revalidateAll();
}

export async function recalcBracket() {
  await requireAdmin();
  await updateBracket();
  revalidateAll();
}

export async function syncNow() {
  await requireAdmin();
  await syncResults({ force: true });
  revalidateAll();
}

export async function sendRemindersNow() {
  await requireAdmin();
  await sendPredictionReminders(24);
}

export async function saveActualAwards(formData: FormData) {
  await requireAdmin();
  const topScorer = String(formData.get("topScorer") ?? "").trim();
  const bestKeeper = String(formData.get("bestKeeper") ?? "").trim();
  const champion = String(formData.get("champion") ?? "").trim();
  const runnerUp = String(formData.get("runnerUp") ?? "").trim();
  const awardsLocked = formData.get("awardsLocked") === "on" ? "1" : "0";

  for (const [key, value] of [
    ["topScorer", topScorer],
    ["bestKeeper", bestKeeper],
    ["champion", champion],
    ["runnerUp", runnerUp],
    ["awardsLocked", awardsLocked],
  ] as const) {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
  revalidateAll();
}
