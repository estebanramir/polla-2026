import { prisma } from "./prisma";

export type TeamOption = { id: string; name: string; flagCode: string };

/** Las 48 selecciones reales (con grupo), ordenadas por nombre, para los selectores. */
export async function getTeamOptions(): Promise<TeamOption[]> {
  const teams = await prisma.team.findMany({
    where: { group: { not: null } },
    select: { id: true, name: true, flagCode: true },
  });
  return teams.sort((a, b) => a.name.localeCompare(b.name, "es"));
}
