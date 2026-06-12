export type StandingRow = {
  teamId: string;
  group: string;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  dg: number;
  pts: number;
};

type MatchLike = {
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
};

/** Tabla de posiciones de un grupo a partir de resultados (función pura). */
export function computeStandings(
  teams: { id: string; group: string | null }[],
  matches: MatchLike[]
): StandingRow[] {
  const rows = new Map<string, StandingRow>(
    teams.map((t) => [
      t.id,
      { teamId: t.id, group: t.group ?? "", pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0 },
    ])
  );
  for (const m of matches) {
    if (m.homeScore == null || m.awayScore == null) continue;
    const h = rows.get(m.homeTeamId!);
    const a = rows.get(m.awayTeamId!);
    if (!h || !a) continue;
    h.pj++;
    a.pj++;
    h.gf += m.homeScore;
    h.gc += m.awayScore;
    a.gf += m.awayScore;
    a.gc += m.homeScore;
    if (m.homeScore > m.awayScore) {
      h.pg++;
      a.pp++;
      h.pts += 3;
    } else if (m.homeScore < m.awayScore) {
      a.pg++;
      h.pp++;
      a.pts += 3;
    } else {
      h.pe++;
      a.pe++;
      h.pts++;
      a.pts++;
    }
  }
  const list = [...rows.values()];
  for (const r of list) r.dg = r.gf - r.gc;
  // Desempate simplificado: puntos, diferencia de gol, goles a favor, código
  list.sort(
    (x, y) =>
      y.pts - x.pts || y.dg - x.dg || y.gf - x.gf || x.teamId.localeCompare(y.teamId)
  );
  return list;
}
