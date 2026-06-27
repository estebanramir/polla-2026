import { prisma } from "./prisma";
import { computeStandings, type StandingRow } from "./standings";

/** Tabla de posiciones de un grupo a partir de resultados reales. */
export async function groupStandings(group: string): Promise<StandingRow[]> {
  const [matches, teams] = await Promise.all([
    prisma.match.findMany({ where: { stage: "GROUP", group } }),
    prisma.team.findMany({ where: { group } }),
  ]);
  return computeStandings(teams, matches);
}

const GROUPS = "ABCDEFGHIJKL".split("");

export type ThirdRow = StandingRow & { qualified: boolean };

/**
 * Tabla de los 12 terceros lugares, ordenada; marca los 8 que clasifican.
 * Mientras la fase de grupos no termine, es provisional.
 */
export async function getThirdPlaceStandings(): Promise<{
  rows: ThirdRow[];
  allComplete: boolean;
}> {
  const tables = await Promise.all(GROUPS.map((g) => groupStandings(g)));
  let allComplete = true;
  const thirds: StandingRow[] = [];
  for (const table of tables) {
    const third = table[2];
    if (third) thirds.push(third);
    // grupo completo = sus 4 equipos jugaron 3 partidos
    if (!table.every((t) => t.pj === 3)) allComplete = false;
  }
  thirds.sort((x, y) => y.pts - x.pts || y.dg - x.dg || y.gf - x.gf);
  return {
    rows: thirds.map((t, i) => ({ ...t, qualified: i < 8 })),
    allComplete,
  };
}

/**
 * Actualiza los cruces de eliminatorias:
 * - Si la fase de grupos está completa, asigna 1°/2° y mejores terceros a los 16avos.
 * - Propaga ganadores/perdedores (W##/L##) a las rondas siguientes.
 * Es idempotente: se puede ejecutar después de cargar cada resultado.
 */
export async function updateBracket() {
  const groupMatches = await prisma.match.findMany({ where: { stage: "GROUP" } });
  const slotTeam = new Map<string, string>(); // "1A" -> teamId

  // Un grupo está terminado cuando sus 6 partidos tienen resultado.
  const matchesByGroup = new Map<string, typeof groupMatches>();
  for (const m of groupMatches) {
    if (!m.group) continue;
    const list = matchesByGroup.get(m.group) ?? [];
    list.push(m);
    matchesByGroup.set(m.group, list);
  }
  const groupDone = (g: string) => {
    const list = matchesByGroup.get(g) ?? [];
    return list.length > 0 && list.every((m) => m.homeScore != null && m.awayScore != null);
  };

  // 1°/2° de cada grupo apenas ese grupo termina (sin esperar a los demás).
  const thirds: StandingRow[] = [];
  let allGroupsDone = true;
  for (const g of GROUPS) {
    if (!groupDone(g)) {
      allGroupsDone = false;
      continue;
    }
    const table = await groupStandings(g);
    slotTeam.set(`1${g}`, table[0].teamId);
    slotTeam.set(`2${g}`, table[1].teamId);
    thirds.push(table[2]);
  }

  // Los mejores terceros solo se pueden asignar cuando TODOS los grupos terminaron.
  if (allGroupsDone) {
    thirds.sort((x, y) => y.pts - x.pts || y.dg - x.dg || y.gf - x.gf);
    const best8 = thirds.slice(0, 8);

    const koMatches = await prisma.match.findMany({ where: { stage: "R32" } });
    const thirdSlots = koMatches
      .filter((m) => m.awaySlot?.startsWith("3:"))
      .map((m) => ({ matchId: m.id, allowed: m.awaySlot!.slice(2).split("") }));

    const assignment = assignThirds(
      thirdSlots,
      best8.map((t) => t.group)
    );
    if (assignment) {
      for (const [slotIdx, thirdIdx] of assignment.entries()) {
        const slot = thirdSlots[slotIdx];
        const third = best8[thirdIdx];
        slotTeam.set(`3@${slot.matchId}`, third.teamId);
      }
    }
  }

  // Ganadores y perdedores de partidos ya jugados
  const allMatches = await prisma.match.findMany();
  const byId = new Map(allMatches.map((m) => [m.id, m]));
  for (const m of allMatches) {
    if (m.stage === "GROUP") continue;
    const winner = matchWinner(m);
    if (winner) {
      slotTeam.set(`W${m.id}`, winner.winnerId);
      slotTeam.set(`L${m.id}`, winner.loserId);
    }
  }

  // Aplicar slots resueltos
  for (const m of allMatches) {
    if (m.stage === "GROUP") continue;
    const updates: { homeTeamId?: string; awayTeamId?: string } = {};
    if (m.homeSlot) {
      const t = resolveSlot(m.homeSlot, m.id, slotTeam);
      if (t && t !== m.homeTeamId) updates.homeTeamId = t;
    }
    if (m.awaySlot) {
      const t = resolveSlot(m.awaySlot, m.id, slotTeam);
      if (t && t !== m.awayTeamId) updates.awayTeamId = t;
    }
    if (Object.keys(updates).length) {
      await prisma.match.update({ where: { id: m.id }, data: updates });
    }
  }
  return byId;
}

function resolveSlot(slot: string, matchId: number, slotTeam: Map<string, string>) {
  if (slot.startsWith("3:")) return slotTeam.get(`3@${matchId}`);
  return slotTeam.get(slot);
}

function matchWinner(m: {
  homeScore: number | null;
  awayScore: number | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  winnerId: string | null;
}) {
  if (m.homeScore == null || m.awayScore == null) return null;
  if (!m.homeTeamId || !m.awayTeamId) return null;
  let winnerId: string | null = null;
  if (m.homeScore > m.awayScore) winnerId = m.homeTeamId;
  else if (m.homeScore < m.awayScore) winnerId = m.awayTeamId;
  else winnerId = m.winnerId; // empate: definido por penales (lo fija el admin)
  if (!winnerId) return null;
  const loserId = winnerId === m.homeTeamId ? m.awayTeamId : m.homeTeamId;
  return { winnerId, loserId };
}

/**
 * Asigna 8 terceros (por grupo) a 8 slots con restricciones de grupos permitidos.
 * Devuelve para cada slot el índice del tercero asignado, o null si no hay solución.
 */
function assignThirds(
  slots: { allowed: string[] }[],
  thirdGroups: string[]
): number[] | null {
  const used = new Array(thirdGroups.length).fill(false);
  const result: number[] = new Array(slots.length).fill(-1);

  function backtrack(i: number): boolean {
    if (i === slots.length) return true;
    for (let j = 0; j < thirdGroups.length; j++) {
      if (used[j]) continue;
      if (!slots[i].allowed.includes(thirdGroups[j])) continue;
      used[j] = true;
      result[i] = j;
      if (backtrack(i + 1)) return true;
      used[j] = false;
    }
    return false;
  }

  return backtrack(0) ? result : null;
}
