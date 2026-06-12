/**
 * Importa las plantillas reales de los 48 equipos desde ESPN.
 * Uso: npx tsx scripts/import-players.ts   (respeta DATABASE_URL del entorno)
 */
import { PrismaClient } from "@prisma/client";
import { NAME_TO_CODE } from "../lib/sync";

const prisma = new PrismaClient();
const BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world";

type EspnTeam = { id: string; abbreviation?: string; displayName?: string };

async function main() {
  const res = await fetch(`${BASE}/teams`);
  if (!res.ok) throw new Error(`ESPN /teams respondió ${res.status}`);
  const data = await res.json();
  const espnTeams: EspnTeam[] = data.sports[0].leagues[0].teams.map(
    (t: { team: EspnTeam }) => t.team
  );

  const ourTeams = new Set((await prisma.team.findMany()).map((t) => t.id));
  let total = 0;

  for (const team of espnTeams) {
    const abbr = team.abbreviation?.toUpperCase();
    const code =
      abbr && ourTeams.has(abbr)
        ? abbr
        : NAME_TO_CODE[(team.displayName ?? "").toLowerCase()];
    if (!code || !ourTeams.has(code)) {
      console.warn(`sin mapeo: ${team.displayName} (${abbr})`);
      continue;
    }

    const rosterRes = await fetch(`${BASE}/teams/${team.id}/roster`);
    if (!rosterRes.ok) {
      console.warn(`sin plantilla: ${code} (${rosterRes.status})`);
      continue;
    }
    const roster = await rosterRes.json();
    const athletes: {
      id: string;
      fullName?: string;
      displayName?: string;
      position?: { abbreviation?: string };
    }[] = roster.athletes ?? [];

    for (const a of athletes) {
      const name = a.fullName ?? a.displayName;
      const position = a.position?.abbreviation ?? "M";
      if (!name) continue;
      await prisma.player.upsert({
        where: { id: a.id },
        update: { name, position, teamId: code },
        create: { id: a.id, name, position, teamId: code },
      });
      total++;
    }
    console.log(`${code}: ${athletes.length} jugadores`);
  }
  console.log(`\nImportados/actualizados: ${total} jugadores`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
