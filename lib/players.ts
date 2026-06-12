import { prisma } from "./prisma";

export type PlayerGroup = { team: string; flagCode: string; players: string[] };

/** Opciones para los selects de premios, agrupadas por selección. */
export async function getAwardOptions() {
  const players = await prisma.player.findMany({
    include: { team: true },
    orderBy: [{ teamId: "asc" }, { name: "asc" }],
  });

  const group = (filter: (pos: string) => boolean): PlayerGroup[] => {
    const byTeam = new Map<string, { flagCode: string; players: string[] }>();
    for (const p of players) {
      if (!filter(p.position)) continue;
      const entry = byTeam.get(p.team.name) ?? { flagCode: p.team.flagCode, players: [] };
      entry.players.push(p.name);
      byTeam.set(p.team.name, entry);
    }
    return [...byTeam.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], "es"))
      .map(([team, { flagCode, players: list }]) => ({ team, flagCode, players: list }));
  };

  return {
    // goleador: delanteros y mediocampistas
    scorers: group((pos) => pos === "F" || pos === "M"),
    // arquero: solo porteros
    keepers: group((pos) => pos === "G"),
  };
}
