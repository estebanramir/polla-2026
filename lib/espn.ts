export const ESPN_BASE =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world";

// Respaldo por nombre en inglés por si alguna abreviatura difiere del código FIFA
export const NAME_TO_CODE: Record<string, string> = {
  mexico: "MEX", "south africa": "RSA", "south korea": "KOR", czechia: "CZE",
  "czech republic": "CZE", canada: "CAN", "bosnia and herzegovina": "BIH",
  "bosnia-herzegovina": "BIH", qatar: "QAT", switzerland: "SUI", brazil: "BRA",
  morocco: "MAR", haiti: "HAI", scotland: "SCO", "united states": "USA",
  usa: "USA", paraguay: "PAR", australia: "AUS", turkey: "TUR", turkiye: "TUR",
  germany: "GER", curacao: "CUW", "ivory coast": "CIV", "cote d'ivoire": "CIV",
  ecuador: "ECU", netherlands: "NED", japan: "JPN", sweden: "SWE", tunisia: "TUN",
  belgium: "BEL", egypt: "EGY", iran: "IRN", "new zealand": "NZL", spain: "ESP",
  "cape verde": "CPV", "cabo verde": "CPV", "saudi arabia": "KSA", uruguay: "URU",
  france: "FRA", senegal: "SEN", iraq: "IRQ", norway: "NOR", argentina: "ARG",
  algeria: "ALG", austria: "AUT", jordan: "JOR", portugal: "POR", "dr congo": "COD",
  "democratic republic of the congo": "COD", "congo dr": "COD", uzbekistan: "UZB",
  colombia: "COL", england: "ENG", croatia: "CRO", ghana: "GHA", panama: "PAN",
};

export type EspnTeamRef = { abbreviation?: string; displayName?: string };

export function teamCode(
  team: EspnTeamRef | undefined,
  validCodes: Set<string>
): string | null {
  if (!team) return null;
  const abbr = team.abbreviation?.toUpperCase();
  if (abbr && validCodes.has(abbr)) return abbr;
  const byName = NAME_TO_CODE[(team.displayName ?? "").toLowerCase()];
  return byName && validCodes.has(byName) ? byName : null;
}

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

export type KnockoutFixture = { homeCode: string; awayCode: string; date: Date };

/**
 * Cruces reales de eliminatorias según ESPN (cada partido con sus dos equipos,
 * por código FIFA). Sirve para asignar los mejores terceros con la tabla oficial.
 */
export async function fetchKnockoutFixtures(
  validCodes: Set<string>,
  from: Date,
  to: Date
): Promise<KnockoutFixture[]> {
  const url = `${ESPN_BASE}/scoreboard?dates=${fmtDate(from)}-${fmtDate(to)}&limit=60`;
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`ESPN respondió ${res.status}`);
  const data = (await res.json()) as {
    events?: {
      date: string;
      competitions: {
        date: string;
        competitors: { homeAway: "home" | "away"; team: EspnTeamRef }[];
      }[];
    }[];
  };

  const fixtures: KnockoutFixture[] = [];
  for (const e of data.events ?? []) {
    const comp = e.competitions?.[0];
    if (!comp) continue;
    const home = comp.competitors.find((c) => c.homeAway === "home");
    const away = comp.competitors.find((c) => c.homeAway === "away");
    const homeCode = teamCode(home?.team, validCodes);
    const awayCode = teamCode(away?.team, validCodes);
    if (!homeCode || !awayCode) continue;
    fixtures.push({ homeCode, awayCode, date: new Date(comp.date ?? e.date) });
  }
  return fixtures;
}
