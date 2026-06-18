import { prisma } from "./prisma";

/**
 * Estado de los premios:
 * - locked: ya no se pueden elegir/cambiar. Se cierran al iniciar las
 *   eliminatorias (fin de la fase de grupos) o si el admin lo fuerza.
 * - tournamentFinished: la final ya se jugó. El goleador y el mejor arquero
 *   solo suman puntos a partir de este momento.
 */
export async function getAwardsState() {
  const [setting, firstKnockout, finalMatch] = await Promise.all([
    prisma.setting.findUnique({ where: { key: "awardsLocked" } }),
    prisma.match.findFirst({
      where: { stage: { not: "GROUP" } },
      orderBy: { kickoff: "asc" },
      select: { kickoff: true },
    }),
    prisma.match.findUnique({
      where: { id: 104 },
      select: { homeScore: true, awayScore: true },
    }),
  ]);

  const now = new Date();
  const groupStageOver = firstKnockout ? now >= firstKnockout.kickoff : false;
  const adminLocked = setting?.value === "1";

  return {
    locked: adminLocked || groupStageOver,
    groupStageOver,
    tournamentFinished:
      finalMatch?.homeScore != null && finalMatch?.awayScore != null,
  };
}
