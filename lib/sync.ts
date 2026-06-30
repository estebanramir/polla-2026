import { prisma } from "./prisma";
import { updateBracket } from "./knockout";
import { ESPN_BASE, NAME_TO_CODE, teamCode as teamCodeFromTeam } from "./espn";

/**
 * Sincroniza resultados reales desde el scoreboard público de ESPN
 * (las abreviaturas de ESPN coinciden con los códigos FIFA del seed).
 */

export { NAME_TO_CODE };
const ESPN_URL = `${ESPN_BASE}/scoreboard`;

/**
 * Marcadores por tiempos de un partido de eliminatorias, leídos del detalle de
 * ESPN (linescores = [1ºT, 2ºT, alargue1, alargue2, penales]):
 * - reg = marcador a los 90'+adición (suma de los 2 primeros tiempos) → puntúa la polla.
 * - final = marcador tras los 120' (suma de hasta 4 tiempos, SIN penales).
 * Devuelve null si no se puede determinar con confianza.
 */
async function fetchKnockoutScores(eventId: string): Promise<{
  reg: { home: number; away: number };
  final: { home: number; away: number };
} | null> {
  try {
    const res = await fetch(`${ESPN_BASE}/summary?event=${eventId}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const comps = data?.header?.competitions?.[0]?.competitors;
    if (!Array.isArray(comps) || comps.length !== 2) return null;
    const sums = (c: { linescores?: { displayValue?: string }[] }) => {
      const ls = c.linescores;
      if (!Array.isArray(ls) || ls.length < 2) return null;
      const nums = ls.map((x) => Number(x?.displayValue));
      if (nums.slice(0, Math.min(nums.length, 4)).some((n) => !Number.isInteger(n))) {
        return null;
      }
      const reg = nums[0] + nums[1];
      // tras los 120' = hasta 4 tiempos; el 5º (penales) se excluye
      const final = nums.slice(0, Math.min(nums.length, 4)).reduce((s, n) => s + n, 0);
      return { reg, final };
    };
    const homeC = comps.find((c) => c.homeAway === "home");
    const awayC = comps.find((c) => c.homeAway === "away");
    if (!homeC || !awayC) return null;
    const h = sums(homeC);
    const a = sums(awayC);
    if (!h || !a) return null;
    return {
      reg: { home: h.reg, away: a.reg },
      final: { home: h.final, away: a.final },
    };
  } catch {
    return null;
  }
}

const FINISHED_STATUSES = new Set([
  "STATUS_FULL_TIME",
  "STATUS_FINAL",
  "STATUS_FINAL_AET",
  "STATUS_FINAL_PEN",
]);

type EspnCompetitor = {
  homeAway: "home" | "away";
  score?: string;
  shootoutScore?: number;
  winner?: boolean;
  advance?: boolean;
  team: { abbreviation?: string; displayName?: string };
};

type EspnEvent = {
  id: string;
  date: string;
  competitions: {
    date: string;
    status: { type: { name: string } };
    competitors: EspnCompetitor[];
  }[];
};

const teamCode = (c: EspnCompetitor, validCodes: Set<string>) =>
  teamCodeFromTeam(c.team, validCodes);

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

  // Desde el partido ya iniciado más viejo que aún no tiene resultado, para
  // poder rellenar también partidos atrasados (sin tope de 7 días).
  const oldestPending = candidates.find((m) => m.kickoff <= now)?.kickoff ?? now;
  const fromDate = new Date(oldestPending.getTime() - 24 * 3600 * 1000);
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

    const isKnockout = match.stage !== "GROUP";
    // alargue o penales: el marcador de ESPN incluye la prórroga
    const wentBeyond90 = /AET|PEN|SHOOTOUT|EXTRA/i.test(comp.status.type.name);
    // local/visitante de la BD pueden venir invertidos respecto a ESPN
    const flipped = match.homeTeamId !== homeCode;

    // equipo que avanza (incluye penales/alargue): bandera de ESPN
    const advancingComp = comp.competitors.find((c) => c.advance || c.winner);
    const advancingCode = advancingComp ? teamCode(advancingComp, validCodes) : null;

    if (isKnockout && wentBeyond90) {
      // Fue a alargue/penales: el marcador del scoreboard incluye la prórroga.
      // La polla puntúa con los 90' (suma de los 2 primeros tiempos) y da bono por
      // acertar el marcador final de los 120'. Ambos se leen del detalle. Automático.
      const scores = await fetchKnockoutScores(event.id);
      const winnerId = advancingCode ?? match.winnerId ?? null;
      if (scores) {
        const { reg, final } = scores;
        await prisma.match.update({
          where: { id: match.id },
          data: {
            homeScore: flipped ? reg.away : reg.home,
            awayScore: flipped ? reg.home : reg.away,
            finalHomeScore: flipped ? final.away : final.home,
            finalAwayScore: flipped ? final.home : final.away,
            winnerId,
          },
        });
        updated++;
      } else if (winnerId && winnerId !== match.winnerId) {
        // si no se pudo leer el marcador de los 90', al menos hacer avanzar al ganador
        await prisma.match.update({
          where: { id: match.id },
          data: { winnerId },
        });
        updated++;
      }
      continue;
    }

    const hs = Number(flipped ? awayC.score : homeC.score);
    const as = Number(flipped ? homeC.score : awayC.score);
    if (!Number.isInteger(hs) || !Number.isInteger(as)) continue;

    // en eliminatoria definida en los 90', el que avanza es el ganador del marcador
    const winnerId = isKnockout
      ? (advancingCode ?? (hs > as ? match.homeTeamId : as > hs ? match.awayTeamId : null))
      : null;

    await prisma.match.update({
      where: { id: match.id },
      data: {
        homeScore: hs,
        awayScore: as,
        // sin alargue → el marcador final coincide con el de los 90'
        ...(isKnockout ? { finalHomeScore: hs, finalAwayScore: as } : {}),
        winnerId,
      },
    });
    updated++;
  }

  if (updated > 0) await updateBracket();
  return { skipped: false, updated, kickoffFixes };
}
