import { prisma } from "./prisma";
import { matchPoints, normalizeName, POINTS } from "./scoring";

export type LeaderboardRow = {
  id: string;
  name: string;
  badge: string | null;
  position: number; // ranking de competición estándar (empates comparten número)
  total: number;
  exacts: number;
  outcomes: number;
  awardPts: number;
  adjustment: number;
};

export async function getLeaderboard(): Promise<LeaderboardRow[]> {
  const [users, finishedMatches, settings] = await Promise.all([
    prisma.user.findMany({ include: { predictions: true, awardPrediction: true } }),
    prisma.match.findMany({
      where: { homeScore: { not: null }, awayScore: { not: null } },
    }),
    prisma.setting.findMany(),
  ]);

  const resultByMatch = new Map(finishedMatches.map((m) => [m.id, m]));
  const settingMap = new Map(settings.map((s) => [s.key, s.value]));
  const actualScorer = settingMap.get("topScorer") ?? "";
  const actualKeeper = settingMap.get("bestKeeper") ?? "";
  const actualChampion = settingMap.get("champion") ?? "";
  const actualRunnerUp = settingMap.get("runnerUp") ?? "";
  // goleador y arquero solo suman cuando la final ya se jugó
  const final = resultByMatch.get(104);
  const tournamentFinished = final?.homeScore != null && final?.awayScore != null;

  const rows = users.map((u) => {
    let matchPts = 0;
    let exacts = 0;
    let outcomes = 0;
    for (const p of u.predictions) {
      const m = resultByMatch.get(p.matchId);
      if (!m) continue;
      const pts = matchPoints(p, { homeScore: m.homeScore!, awayScore: m.awayScore! });
      matchPts += pts;
      if (pts === POINTS.exact) exacts++;
      else if (pts === POINTS.outcome) outcomes++;
    }
    let awardPts = 0;
    if (
      tournamentFinished &&
      actualScorer &&
      u.awardPrediction?.topScorer &&
      normalizeName(u.awardPrediction.topScorer) === normalizeName(actualScorer)
    ) {
      awardPts += POINTS.topScorer;
    }
    if (
      tournamentFinished &&
      actualKeeper &&
      u.awardPrediction?.bestKeeper &&
      normalizeName(u.awardPrediction.bestKeeper) === normalizeName(actualKeeper)
    ) {
      awardPts += POINTS.bestKeeper;
    }
    if (actualChampion && u.awardPrediction?.champion === actualChampion) {
      awardPts += POINTS.champion;
    }
    if (actualRunnerUp && u.awardPrediction?.runnerUp === actualRunnerUp) {
      awardPts += POINTS.runnerUp;
    }
    return {
      id: u.id,
      name: u.displayName,
      badge: u.badge,
      position: 0, // se asigna abajo
      total: matchPts + awardPts + u.pointsAdjustment,
      exacts,
      outcomes,
      awardPts,
      adjustment: u.pointsAdjustment,
    };
  });

  rows.sort(
    (a, b) => b.total - a.total || b.exacts - a.exacts || a.name.localeCompare(b.name)
  );

  // ranking de competición estándar: los empatados (mismos puntos) comparten
  // posición y la siguiente posición salta (1, 1, 3, 4...)
  rows.forEach((r, i) => {
    r.position = i > 0 && r.total === rows[i - 1].total ? rows[i - 1].position : i + 1;
  });

  return rows;
}
