export const POINTS = {
  exact: 5,
  outcome: 2,
  knockoutFinal: 3, // bono por acertar el marcador final tras alargue (eliminatorias)
  topScorer: 5,
  bestKeeper: 5,
  champion: 10,
  runnerUp: 5,
};

type Score = { homeScore: number; awayScore: number };

function outcome(s: Score) {
  if (s.homeScore > s.awayScore) return "H";
  if (s.homeScore < s.awayScore) return "A";
  return "D";
}

function sameScore(a: Score, b: Score) {
  return a.homeScore === b.homeScore && a.awayScore === b.awayScore;
}

/** Puntos de una predicción contra el resultado a los 90' (5 exacto / 2 resultado). */
export function matchPoints(prediction: Score, result: Score) {
  if (sameScore(prediction, result)) return POINTS.exact;
  if (outcome(prediction) === outcome(result)) return POINTS.outcome;
  return 0;
}

/**
 * Bono de eliminatorias: si el partido fue empate a los 90' y se definió en
 * alargue (el marcador final de los 120' es distinto al de los 90'), quien
 * predijo el marcador final exacto gana +3. Si el marcador no cambió, no hay bono.
 */
export function knockoutFinalBonus(
  prediction: Score,
  reg: Score,
  final: Score | null
) {
  if (!final) return 0;
  if (sameScore(final, reg)) return 0; // no cambió tras los 90' → sin bono
  return sameScore(prediction, final) ? POINTS.knockoutFinal : 0;
}

type MatchResult = {
  stage: string;
  homeScore: number | null;
  awayScore: number | null;
  finalHomeScore?: number | null;
  finalAwayScore?: number | null;
};

/** Puntos totales de una predicción para un partido (90' + bono de eliminatorias). */
export function predictionPoints(
  prediction: Score,
  m: MatchResult
): number | null {
  if (m.homeScore == null || m.awayScore == null) return null;
  const reg = { homeScore: m.homeScore, awayScore: m.awayScore };
  let pts = matchPoints(prediction, reg);
  if (m.stage !== "GROUP") {
    const final =
      m.finalHomeScore != null && m.finalAwayScore != null
        ? { homeScore: m.finalHomeScore, awayScore: m.finalAwayScore }
        : reg;
    pts += knockoutFinalBonus(prediction, reg, final);
  }
  return pts;
}

export function normalizeName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}
