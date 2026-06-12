"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { updateBracket } from "@/lib/knockout";
import { syncResults } from "@/lib/sync";

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

export async function saveActualAwards(formData: FormData) {
  await requireAdmin();
  const topScorer = String(formData.get("topScorer") ?? "").trim();
  const bestKeeper = String(formData.get("bestKeeper") ?? "").trim();
  const awardsLocked = formData.get("awardsLocked") === "on" ? "1" : "0";

  for (const [key, value] of [
    ["topScorer", topScorer],
    ["bestKeeper", bestKeeper],
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
