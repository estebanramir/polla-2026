"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getAwardsState } from "@/lib/awards";

export async function savePrediction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { error: "Inicia sesión de nuevo" };

  const matchId = Number(formData.get("matchId"));
  const homeScore = Number(formData.get("homeScore"));
  const awayScore = Number(formData.get("awayScore"));

  if (
    !Number.isInteger(matchId) ||
    !Number.isInteger(homeScore) ||
    !Number.isInteger(awayScore) ||
    homeScore < 0 ||
    awayScore < 0 ||
    homeScore > 99 ||
    awayScore > 99
  ) {
    return { error: "Marcador inválido" };
  }

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return { error: "Partido no encontrado" };
  if (match.kickoff <= new Date()) {
    return { error: "El partido ya empezó, no se puede cambiar" };
  }

  await prisma.prediction.upsert({
    where: { userId_matchId: { userId: user.id, matchId } },
    update: { homeScore, awayScore },
    create: { userId: user.id, matchId, homeScore, awayScore },
  });
  revalidatePath("/");
  return { ok: true };
}

export async function saveAwards(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { error: "Inicia sesión de nuevo" };

  const { locked } = await getAwardsState();
  if (locked) {
    return { error: "Los premios ya están cerrados" };
  }

  const topScorer = String(formData.get("topScorer") ?? "").trim();
  const bestKeeper = String(formData.get("bestKeeper") ?? "").trim();
  const champion = String(formData.get("champion") ?? "").trim();
  const runnerUp = String(formData.get("runnerUp") ?? "").trim();

  // solo jugadores reales de la lista, nada de texto libre
  if (topScorer) {
    const ok = await prisma.player.findFirst({
      where: { name: topScorer, position: { in: ["F", "M"] } },
    });
    if (!ok) return { error: "Elige un goleador de la lista" };
  }
  if (bestKeeper) {
    const ok = await prisma.player.findFirst({
      where: { name: bestKeeper, position: "G" },
    });
    if (!ok) return { error: "Elige un arquero de la lista" };
  }
  // solo equipos reales
  for (const [id, label] of [
    [champion, "campeón"],
    [runnerUp, "subcampeón"],
  ] as const) {
    if (id) {
      const ok = await prisma.team.findFirst({ where: { id, group: { not: null } } });
      if (!ok) return { error: `Elige un ${label} de la lista` };
    }
  }
  if (champion && runnerUp && champion === runnerUp) {
    return { error: "Campeón y subcampeón deben ser distintos" };
  }

  await prisma.awardPrediction.upsert({
    where: { userId: user.id },
    update: { topScorer, bestKeeper, champion, runnerUp },
    create: { userId: user.id, topScorer, bestKeeper, champion, runnerUp },
  });
  revalidatePath("/premios");
  return { ok: true };
}
