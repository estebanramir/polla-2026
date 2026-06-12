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

/**
 * Actualiza los cruces de eliminatorias:
 * - Si la fase de grupos está completa, asigna 1°/2° y mejores terceros a los 16avos.
 * - Propaga ganadores/perdedores (W##/L##) a las rondas siguientes.
 * Es idempotente: se puede ejecutar después de cargar cada resultado.
 */
export async function updateBracket() {
  const groupMatches = await prisma.match.findMany({ where: { stage: "GROUP" } });
  const groupsDone = groupMatches.every(
    (m) => m.homeScore != null && m.awayScore != null
  );

  const slotTeam = new Map<string, string>(); // "1A" -> teamId

  if (groupsDone) {
    const thirds: StandingRow[] = [];
    for (const g of GROUPS) {
      const table = await groupStandings(g);
      slotTeam.set(`1${g}`, table[0].teamId);
      slotTeam.set(`2${g}`, table[1].teamId);
      thirds.push(table[2]);
    }
    // Mejores 8 terceros
    thirds.sort((x, y) => y.pts - x.pts || y.dg - x.dg || y.gf - x.gf);
    const best8 = thirds.slice(0, 8);

    // Slots de terceros con sus grupos permitidos
    const koMatches = await prisma.match.findMany({ where: { stage: "R32" } });
    const thirdSlots = koMatches
      .filter((m) => m.awaySlot?.startsWith("3:"))
      .map((m) => ({ matchId: m.id, allowed: m.awaySlot!.slice(2).split("") }));

    // Asignación por backtracking: cada tercero a un slot cuyo grupo esté permitido
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
