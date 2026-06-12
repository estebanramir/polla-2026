export const POINTS = {
  exact: 5,
  outcome: 2,
  topScorer: 10,
  bestKeeper: 10,
};

type Score = { homeScore: number; awayScore: number };

function outcome(s: Score) {
  if (s.homeScore > s.awayScore) return "H";
  if (s.homeScore < s.awayScore) return "A";
  return "D";
}

/** Puntos de una predicción contra el resultado real (tiempo reglamentario). */
export function matchPoints(prediction: Score, result: Score) {
  if (
    prediction.homeScore === result.homeScore &&
    prediction.awayScore === result.awayScore
  ) {
    return POINTS.exact;
  }
  if (outcome(prediction) === outcome(result)) return POINTS.outcome;
  return 0;
}

export function normalizeName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}
