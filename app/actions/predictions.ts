"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

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

  const locked = await prisma.setting.findUnique({ where: { key: "awardsLocked" } });
  if (locked?.value === "1") {
    return { error: "Los premios ya están cerrados" };
  }

  const topScorer = String(formData.get("topScorer") ?? "").trim();
  const bestKeeper = String(formData.get("bestKeeper") ?? "").trim();

  await prisma.awardPrediction.upsert({
    where: { userId: user.id },
    update: { topScorer, bestKeeper },
    create: { userId: user.id, topScorer, bestKeeper },
  });
  revalidatePath("/premios");
  return { ok: true };
}
