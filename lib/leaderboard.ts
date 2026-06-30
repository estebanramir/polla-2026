import { prisma } from "./prisma";
import { matchPoints, knockoutFinalBonus, normalizeName, POINTS } from "./scoring";

export type RankRow = {
  id: string;
  name: string;
  badge: string | null;
  position: number; // ranking de competición estándar (empates comparten número)
  total: number;
  exacts: number;
  outcomes: number;
  awardPts: number; // premios (relevante en la pestaña de eliminatorias)
  adjustment: number; // ajuste manual (relevante en la pestaña de grupos)
};

export type Rankings = { groups: RankRow[]; finals: RankRow[] };

/** Asigna posición compartida en empates: 1, 1, 3, 4… */
function assignPositions(rows: RankRow[]) {
  rows.sort(
    (a, b) => b.total - a.total || b.exacts - a.exacts || a.name.localeCompare(b.name)
  );
  rows.forEach((r, i) => {
    r.position = i > 0 && r.total === rows[i - 1].total ? rows[i - 1].position : i + 1;
  });
  return rows;
}

/**
 * Dos rankings independientes:
 * - groups: puntos de pronósticos de la fase de grupos + ajuste manual.
 * - finals: puntos de pronósticos de eliminatorias + premios.
 */
export async function getRankings(): Promise<Rankings> {
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
  const final = resultByMatch.get(104);
  const tournamentFinished = final?.homeScore != null && final?.awayScore != null;

  const groups: RankRow[] = [];
  const finals: RankRow[] = [];

  for (const u of users) {
    let groupPts = 0,
      groupExacts = 0,
      groupOutcomes = 0;
    let koPts = 0,
      koExacts = 0,
      koOutcomes = 0;

    for (const p of u.predictions) {
      const m = resultByMatch.get(p.matchId);
      if (!m) continue;
      const reg = { homeScore: m.homeScore!, awayScore: m.awayScore! };
      const pts = matchPoints(p, reg);
      if (m.stage === "GROUP") {
        groupPts += pts;
        if (pts === POINTS.exact) groupExacts++;
        else if (pts === POINTS.outcome) groupOutcomes++;
      } else {
        // 90' + bono por marcador final tras alargue
        const final =
          m.finalHomeScore != null && m.finalAwayScore != null
            ? { homeScore: m.finalHomeScore, awayScore: m.finalAwayScore }
            : reg;
        koPts += pts + knockoutFinalBonus(p, reg, final);
        if (pts === POINTS.exact) koExacts++;
        else if (pts === POINTS.outcome) koOutcomes++;
      }
    }

    // Premios (cuentan en la pestaña de eliminatorias)
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

    const base = { id: u.id, name: u.displayName, badge: u.badge, position: 0 };
    groups.push({
      ...base,
      total: groupPts + u.pointsAdjustment,
      exacts: groupExacts,
      outcomes: groupOutcomes,
      awardPts: 0,
      adjustment: u.pointsAdjustment,
    });
    finals.push({
      ...base,
      total: koPts + awardPts,
      exacts: koExacts,
      outcomes: koOutcomes,
      awardPts,
      adjustment: 0,
    });
  }

  return { groups: assignPositions(groups), finals: assignPositions(finals) };
}
