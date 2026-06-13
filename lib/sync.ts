import { prisma } from "./prisma";
import { updateBracket } from "./knockout";

/**
 * Sincroniza resultados reales desde el scoreboard público de ESPN
 * (las abreviaturas de ESPN coinciden con los códigos FIFA del seed).
 */

const ESPN_URL =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";

const FINISHED_STATUSES = new Set([
  "STATUS_FULL_TIME",
  "STATUS_FINAL",
  "STATUS_FINAL_AET",
  "STATUS_FINAL_PEN",
]);

// Respaldo por nombre en inglés por si alguna abreviatura difiere
export const NAME_TO_CODE: Record<string, string> = {
  mexico: "MEX", "south africa": "RSA", "south korea": "KOR", czechia: "CZE",
  "czech republic": "CZE", canada: "CAN", "bosnia and herzegovina": "BIH",
  qatar: "QAT", switzerland: "SUI", brazil: "BRA", morocco: "MAR", haiti: "HAI",
  scotland: "SCO", "united states": "USA", usa: "USA", paraguay: "PAR",
  australia: "AUS", turkey: "TUR", turkiye: "TUR", germany: "GER",
  curacao: "CUW", "ivory coast": "CIV", "cote d'ivoire": "CIV", ecuador: "ECU",
  netherlands: "NED", japan: "JPN", sweden: "SWE", tunisia: "TUN",
  belgium: "BEL", egypt: "EGY", iran: "IRN", "new zealand": "NZL",
  spain: "ESP", "cape verde": "CPV", "cabo verde": "CPV", "saudi arabia": "KSA",
  uruguay: "URU", france: "FRA", senegal: "SEN", iraq: "IRQ", norway: "NOR",
  argentina: "ARG", algeria: "ALG", austria: "AUT", jordan: "JOR",
  portugal: "POR", "dr congo": "COD", "democratic republic of the congo": "COD",
  uzbekistan: "UZB", colombia: "COL", england: "ENG", croatia: "CRO",
  ghana: "GHA", panama: "PAN",
};

type EspnCompetitor = {
  homeAway: "home" | "away";
  score?: string;
  shootoutScore?: number;
  team: { abbreviation?: string; displayName?: string };
};

type EspnEvent = {
  date: string;
  competitions: {
    date: string;
    status: { type: { name: string } };
    competitors: EspnCompetitor[];
  }[];
};

function teamCode(c: EspnCompetitor, validCodes: Set<string>): string | null {
  const abbr = c.team.abbreviation?.toUpperCase();
  if (abbr && validCodes.has(abbr)) return abbr;
  const byName = NAME_TO_CODE[(c.team.displayName ?? "").toLowerCase()];
  return byName && validCodes.has(byName) ? byName : null;
}

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

const THROTTLE_MS = 10 * 60 * 1000; // máx. una consulta cada 10 min

export async function syncResults({ force = false, daysAhead = 4 } = {}) {
  const now = new Date();

  const last = await prisma.setting.findUnique({ where: { key: "lastSyncAt" } });
  if (!force && last && now.getTime() - new Date(last.value).getTime() < THROTTLE_MS) {
    return { skipped: true, updated: 0, kickoffFixes: 0 };
  }

  // Partidos sin resultado con ambos equipos definidos: candidatos a
  // recibir marcador (si ya terminaron) o corrección de horario (si no)
  const candidates = await prisma.match.findMany({
    where: {
      OR: [{ homeScore: null }, { awayScore: null }],
      homeTeamId: { not: null },
      awayTeamId: { not: null },
    },
    orderBy: { kickoff: "asc" },
  });

  await prisma.setting.upsert({
    where: { key: "lastSyncAt" },
    update: { value: now.toISOString() },
    create: { key: "lastSyncAt", value: now.toISOString() },
  });

  if (!candidates.length) return { skipped: false, updated: 0, kickoffFixes: 0 };

  // desde el partido pendiente más viejo (máx. 7 días atrás) hasta daysAhead
  const oldestPending = candidates.find((m) => m.kickoff <= now)?.kickoff;
  const fromDate = new Date(
    Math.max(
      Math.min(oldestPending?.getTime() ?? now.getTime(), now.getTime()),
      now.getTime() - 7 * 24 * 3600 * 1000
    ) - 24 * 3600 * 1000
  );
  const from = fmtDate(fromDate);
  const to = fmtDate(new Date(now.getTime() + daysAhead * 24 * 3600 * 1000));
  const res = await fetch(`${ESPN_URL}?dates=${from}-${to}&limit=300`, {
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`ESPN respondió ${res.status}`);
  const data = (await res.json()) as { events?: EspnEvent[] };

  const validCodes = new Set(
    (await prisma.team.findMany({ select: { id: true } })).map((t) => t.id)
  );

  let updated = 0;
  let kickoffFixes = 0;
  for (const event of data.events ?? []) {
    const comp = event.competitions?.[0];
    if (!comp) continue;

    const homeC = comp.competitors.find((c) => c.homeAway === "home");
    const awayC = comp.competitors.find((c) => c.homeAway === "away");
    if (!homeC || !awayC) continue;
    const homeCode = teamCode(homeC, validCodes);
    const awayCode = teamCode(awayC, validCodes);
    if (!homeCode || !awayCode) continue;

    const eventDate = new Date(comp.date ?? event.date);
    // mismo par de equipos (en cualquier orden) y kickoff a menos de 36 h
    const match = candidates.find(
      (m) =>
        ((m.homeTeamId === homeCode && m.awayTeamId === awayCode) ||
          (m.homeTeamId === awayCode && m.awayTeamId === homeCode)) &&
        Math.abs(m.kickoff.getTime() - eventDate.getTime()) < 36 * 3600 * 1000
    );
    if (!match) continue;

    // la hora de ESPN es la oficial: corregirla si difiere (solo sin resultado)
    if (
      !Number.isNaN(eventDate.getTime()) &&
      Math.abs(match.kickoff.getTime() - eventDate.getTime()) > 60_000
    ) {
      await prisma.match.update({
        where: { id: match.id },
        data: { kickoff: eventDate },
      });
      kickoffFixes++;
    }

    if (!FINISHED_STATUSES.has(comp.status.type.name)) continue;

    const flipped = match.homeTeamId !== homeCode;
    const hs = Number(flipped ? awayC.score : homeC.score);
    const as = Number(flipped ? homeC.score : awayC.score);
    if (!Number.isInteger(hs) || !Number.isInteger(as)) continue;

    // ganador por penales en eliminatorias
    let winnerId: string | null = null;
    if (hs === as && homeC.shootoutScore != null && awayC.shootoutScore != null) {
      winnerId = homeC.shootoutScore > awayC.shootoutScore ? homeCode : awayCode;
    }

    await prisma.match.update({
      where: { id: match.id },
      data: { homeScore: hs, awayScore: as, winnerId },
    });
    updated++;
  }

  if (updated > 0) await updateBracket();
  return { skipped: false, updated, kickoffFixes };
}
