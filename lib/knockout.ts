import { prisma } from "./prisma";
import { computeStandings, type StandingRow } from "./standings";
import { fetchKnockoutFixtures } from "./espn";

const third = (rows: StandingRow[], teamId: string) =>
  rows.find((r) => r.teamId === teamId);

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
      .map((m) => ({
        matchId: m.id,
        homeSlot: m.homeSlot!, // el rival (1°/2° de grupo) ya resuelto
        allowed: m.awaySlot!.slice(2).split(""),
      }));

    // Preferimos la asignación REAL de ESPN (tabla oficial de la FIFA): para cada
    // partido, el rival del tercero es un 1°/2° de grupo ya conocido; buscamos ese
    // equipo en los cruces de ESPN y el otro equipo es el tercero correcto.
    let assignedFromEspn = false;
    try {
      const validCodes = new Set(best8.map((t) => t.teamId));
      const allCodes = new Set(
        (await prisma.team.findMany({ select: { id: true } })).map((t) => t.id)
      );
      // Solo la ventana de 16avos (no la última fecha de grupos, que comparte equipos).
      const r32Kickoffs = koMatches.map((m) => m.kickoff.getTime());
      const from = new Date(Math.min(...r32Kickoffs) - 6 * 3600 * 1000);
      const to = new Date(Math.max(...r32Kickoffs) + 24 * 3600 * 1000);
      const fixtures = await fetchKnockoutFixtures(allCodes, from, to);

      let allMatched = true;
      const pending = new Map<number, string>(); // matchId -> thirdId
      for (const slot of thirdSlots) {
        const opp = slotTeam.get(slot.homeSlot);
        if (!opp) {
          allMatched = false;
          break;
        }
        // el rival juega un solo partido de 16avos; tomamos el más reciente por si acaso
        const fx = fixtures
          .filter((f) => f.homeCode === opp || f.awayCode === opp)
          .sort((a, b) => b.date.getTime() - a.date.getTime())[0];
        const thirdId = fx ? (fx.homeCode === opp ? fx.awayCode : fx.homeCode) : null;
        if (!thirdId || !validCodes.has(thirdId) || !slot.allowed.includes(third(best8, thirdId)?.group ?? "")) {
          allMatched = false;
          break;
        }
        pending.set(slot.matchId, thirdId);
      }
      if (allMatched && pending.size === thirdSlots.length) {
        for (const [matchId, thirdId] of pending) slotTeam.set(`3@${matchId}`, thirdId);
        assignedFromEspn = true;
      }
    } catch {
      // si ESPN falla, usamos el respaldo de abajo
    }

    // Respaldo: backtracking que respeta las restricciones de grupo (puede diferir
    // de la asignación oficial, pero deja el cuadro completo si ESPN no responde).
    if (!assignedFromEspn) {
      const assignment = assignThirds(
        thirdSlots,
        best8.map((t) => t.group)
      );
      if (assignment) {
        for (const [slotIdx, thirdIdx] of assignment.entries()) {
          slotTeam.set(`3@${thirdSlots[slotIdx].matchId}`, best8[thirdIdx].teamId);
        }
      }
    }
  }

  // Ganadores y perdedores de partidos ya jugados.
  // El que avanza viene de winnerId (penales/alargue, lo fija el sync o el admin)
  // o, si no está, del marcador decisivo de los 90'.
  const allMatches = await prisma.match.findMany();
  const byId = new Map(allMatches.map((m) => [m.id, m]));
  for (const m of allMatches) {
    if (m.stage === "GROUP" || !m.homeTeamId || !m.awayTeamId) continue;
    let winnerId = m.winnerId;
    if (!winnerId && m.homeScore != null && m.awayScore != null) {
      if (m.homeScore > m.awayScore) winnerId = m.homeTeamId;
      else if (m.awayScore > m.homeScore) winnerId = m.awayTeamId;
    }
    if (winnerId) {
      const loserId = winnerId === m.homeTeamId ? m.awayTeamId : m.homeTeamId;
      slotTeam.set(`W${m.id}`, winnerId);
      slotTeam.set(`L${m.id}`, loserId);
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
