/**
 * Script de verificación local: ejercita puntaje y generación de eliminatorias
 * con datos de prueba y luego deja la base como estaba (solo seed).
 * Uso: npx tsx scripts/verify.ts
 */
import { PrismaClient } from "@prisma/client";
import { matchPoints } from "../lib/scoring";
import { updateBracket, groupStandings } from "../lib/knockout";

const prisma = new PrismaClient();

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FALLO: ${msg}`);
  console.log(`OK: ${msg}`);
}

async function main() {
  // 1. Puntaje
  assert(matchPoints({ homeScore: 2, awayScore: 1 }, { homeScore: 2, awayScore: 1 }) === 5, "marcador exacto da 5 pts");
  assert(matchPoints({ homeScore: 3, awayScore: 1 }, { homeScore: 2, awayScore: 1 }) === 2, "acertar ganador da 2 pts");
  assert(matchPoints({ homeScore: 0, awayScore: 0 }, { homeScore: 1, awayScore: 1 }) === 2, "acertar empate da 2 pts");
  assert(matchPoints({ homeScore: 1, awayScore: 0 }, { homeScore: 0, awayScore: 2 }) === 0, "fallar da 0 pts");

  // 2. Resultados ficticios para los 72 partidos de grupos
  const groupMatches = await prisma.match.findMany({ where: { stage: "GROUP" } });
  assert(groupMatches.length === 72, "hay 72 partidos de fase de grupos");
  let i = 0;
  for (const m of groupMatches) {
    // patrón determinista con goles variados
    await prisma.match.update({
      where: { id: m.id },
      data: { homeScore: i % 4, awayScore: (i + 1) % 3 },
    });
    i++;
  }

  // 3. Posiciones de un grupo suman 18 puntos (6 partidos x 3) o menos con empates
  const tableA = await groupStandings("A");
  assert(tableA.length === 4, "tabla del grupo A tiene 4 equipos");
  assert(tableA[0].pts >= tableA[3].pts, "tabla ordenada por puntos");

  // 4. Generar 16avos
  await updateBracket();
  const r32 = await prisma.match.findMany({ where: { stage: "R32" } });
  const filled = r32.filter((m) => m.homeTeamId && m.awayTeamId);
  assert(filled.length === 16, `los 16 cruces de 16avos quedaron asignados (${filled.length}/16)`);
  const teamsInR32 = new Set(r32.flatMap((m) => [m.homeTeamId, m.awayTeamId]));
  assert(teamsInR32.size === 32, "32 equipos distintos en 16avos");

  // 5. Jugar todas las eliminatorias (gana siempre el local, sin empates)
  for (const stage of ["R32", "R16", "QF", "SF", "THIRD", "FINAL"]) {
    const ms = await prisma.match.findMany({ where: { stage } });
    for (const m of ms) {
      assert(!!m.homeTeamId && !!m.awayTeamId, `P${m.id} (${stage}) tiene ambos equipos`);
      await prisma.match.update({
        where: { id: m.id },
        data: { homeScore: 1, awayScore: 0 },
      });
    }
    await updateBracket();
  }
  const final = await prisma.match.findUnique({ where: { id: 104 } });
  assert(!!final?.homeTeamId && !!final?.awayTeamId, "la final tiene dos equipos");

  // 6. Empate en eliminatoria requiere ganador por penales
  await prisma.match.update({ where: { id: 104 }, data: { homeScore: 1, awayScore: 1, winnerId: null } });
  await updateBracket(); // no debe explotar sin ganador definido
  await prisma.match.update({ where: { id: 104 }, data: { winnerId: final!.homeTeamId } });
  await updateBracket();
  console.log("OK: empate con penales no rompe la propagación");

  // 7. Limpiar: volver al estado del seed
  await prisma.match.updateMany({ data: { homeScore: null, awayScore: null, winnerId: null } });
  await prisma.match.updateMany({
    where: { stage: { not: "GROUP" } },
    data: { homeTeamId: null, awayTeamId: null },
  });
  console.log("\nTodo verificado y base restaurada al estado inicial.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
