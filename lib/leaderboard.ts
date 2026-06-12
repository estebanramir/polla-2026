import { prisma } from "./prisma";
import { matchPoints, normalizeName, POINTS } from "./scoring";

export type LeaderboardRow = {
  id: string;
  name: string;
  total: number;
  exacts: number;
  outcomes: number;
  awardPts: number;
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
      actualScorer &&
      u.awardPrediction?.topScorer &&
      normalizeName(u.awardPrediction.topScorer) === normalizeName(actualScorer)
    ) {
      awardPts += POINTS.topScorer;
    }
    if (
      actualKeeper &&
      u.awardPrediction?.bestKeeper &&
      normalizeName(u.awardPrediction.bestKeeper) === normalizeName(actualKeeper)
    ) {
      awardPts += POINTS.bestKeeper;
    }
    return {
      id: u.id,
      name: u.displayName,
      total: matchPts + awardPts,
      exacts,
      outcomes,
      awardPts,
    };
  });

  rows.sort(
    (a, b) => b.total - a.total || b.exacts - a.exacts || a.name.localeCompare(b.name)
  );
  return rows;
}
