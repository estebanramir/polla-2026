import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";

const prisma = new PrismaClient();

// [código FIFA, nombre, código bandera flagcdn, grupo]
const TEAMS: [string, string, string, string][] = [
  // Grupo A
  ["MEX", "México", "mx", "A"],
  ["RSA", "Sudáfrica", "za", "A"],
  ["KOR", "Corea del Sur", "kr", "A"],
  ["CZE", "Chequia", "cz", "A"],
  // Grupo B
  ["CAN", "Canadá", "ca", "B"],
  ["BIH", "Bosnia y Herzegovina", "ba", "B"],
  ["QAT", "Catar", "qa", "B"],
  ["SUI", "Suiza", "ch", "B"],
  // Grupo C
  ["BRA", "Brasil", "br", "C"],
  ["MAR", "Marruecos", "ma", "C"],
  ["HAI", "Haití", "ht", "C"],
  ["SCO", "Escocia", "gb-sct", "C"],
  // Grupo D
  ["USA", "Estados Unidos", "us", "D"],
  ["PAR", "Paraguay", "py", "D"],
  ["AUS", "Australia", "au", "D"],
  ["TUR", "Turquía", "tr", "D"],
  // Grupo E
  ["GER", "Alemania", "de", "E"],
  ["CUW", "Curazao", "cw", "E"],
  ["CIV", "Costa de Marfil", "ci", "E"],
  ["ECU", "Ecuador", "ec", "E"],
  // Grupo F
  ["NED", "Países Bajos", "nl", "F"],
  ["JPN", "Japón", "jp", "F"],
  ["SWE", "Suecia", "se", "F"],
  ["TUN", "Túnez", "tn", "F"],
  // Grupo G
  ["BEL", "Bélgica", "be", "G"],
  ["EGY", "Egipto", "eg", "G"],
  ["IRN", "Irán", "ir", "G"],
  ["NZL", "Nueva Zelanda", "nz", "G"],
  // Grupo H
  ["ESP", "España", "es", "H"],
  ["CPV", "Cabo Verde", "cv", "H"],
  ["KSA", "Arabia Saudita", "sa", "H"],
  ["URU", "Uruguay", "uy", "H"],
  // Grupo I
  ["FRA", "Francia", "fr", "I"],
  ["SEN", "Senegal", "sn", "I"],
  ["IRQ", "Irak", "iq", "I"],
  ["NOR", "Noruega", "no", "I"],
  // Grupo J
  ["ARG", "Argentina", "ar", "J"],
  ["ALG", "Argelia", "dz", "J"],
  ["AUT", "Austria", "at", "J"],
  ["JOR", "Jordania", "jo", "J"],
  // Grupo K
  ["POR", "Portugal", "pt", "K"],
  ["COD", "RD Congo", "cd", "K"],
  ["UZB", "Uzbekistán", "uz", "K"],
  ["COL", "Colombia", "co", "K"],
  // Grupo L
  ["ENG", "Inglaterra", "gb-eng", "L"],
  ["CRO", "Croacia", "hr", "L"],
  ["GHA", "Ghana", "gh", "L"],
  ["PAN", "Panamá", "pa", "L"],
];

// [nº partido, grupo, local, visitante, kickoff UTC ISO]
const GROUP_MATCHES: [number, string, string, string, string][] = [
  // Jueves 11 de junio
  [1, "A", "MEX", "RSA", "2026-06-11T19:00:00Z"],
  [2, "A", "KOR", "CZE", "2026-06-12T03:00:00Z"],
  // Viernes 12
  [3, "B", "CAN", "BIH", "2026-06-12T19:00:00Z"],
  [4, "D", "USA", "PAR", "2026-06-12T23:00:00Z"],
  // Sábado 13
  [5, "C", "HAI", "SCO", "2026-06-14T04:00:00Z"],
  [6, "C", "BRA", "MAR", "2026-06-13T23:00:00Z"],
  [7, "B", "QAT", "SUI", "2026-06-13T19:00:00Z"],
  [8, "D", "AUS", "TUR", "2026-06-14T04:00:00Z"],
  // Domingo 14
  [9, "E", "CIV", "ECU", "2026-06-14T23:00:00Z"],
  [10, "E", "GER", "CUW", "2026-06-14T16:00:00Z"],
  [11, "F", "NED", "JPN", "2026-06-14T19:00:00Z"],
  [12, "F", "SWE", "TUN", "2026-06-15T00:00:00Z"],
  // Lunes 15
  [13, "H", "KSA", "URU", "2026-06-15T23:00:00Z"],
  [14, "H", "ESP", "CPV", "2026-06-15T17:00:00Z"],
  [15, "G", "IRN", "NZL", "2026-06-15T23:00:00Z"],
  [16, "G", "BEL", "EGY", "2026-06-15T16:00:00Z"],
  // Martes 16
  [17, "I", "FRA", "SEN", "2026-06-16T20:00:00Z"],
  [18, "I", "IRQ", "NOR", "2026-06-16T23:00:00Z"],
  [19, "J", "ARG", "ALG", "2026-06-17T01:00:00Z"],
  [20, "J", "AUT", "JOR", "2026-06-17T01:00:00Z"],
  // Miércoles 17
  [21, "L", "GHA", "PAN", "2026-06-18T00:00:00Z"],
  [22, "L", "ENG", "CRO", "2026-06-17T19:00:00Z"],
  [23, "K", "POR", "COD", "2026-06-17T16:00:00Z"],
  [24, "K", "UZB", "COL", "2026-06-18T01:00:00Z"],
  // Jueves 18
  [25, "A", "CZE", "RSA", "2026-06-18T17:00:00Z"],
  [26, "B", "SUI", "BIH", "2026-06-18T17:00:00Z"],
  [27, "B", "CAN", "QAT", "2026-06-18T19:00:00Z"],
  [28, "A", "MEX", "KOR", "2026-06-19T00:00:00Z"],
  // Viernes 19
  [29, "C", "BRA", "HAI", "2026-06-20T04:00:00Z"],
  [30, "C", "SCO", "MAR", "2026-06-20T01:00:00Z"],
  [31, "D", "TUR", "PAR", "2026-06-20T04:00:00Z"],
  [32, "D", "USA", "AUS", "2026-06-19T19:00:00Z"],
  // Sábado 20
  [33, "E", "GER", "CIV", "2026-06-20T23:00:00Z"],
  [34, "E", "ECU", "CUW", "2026-06-21T02:00:00Z"],
  [35, "F", "NED", "SWE", "2026-06-20T16:00:00Z"],
  [36, "F", "TUN", "JPN", "2026-06-21T02:00:00Z"],
  // Domingo 21
  [37, "H", "URU", "CPV", "2026-06-21T22:00:00Z"],
  [38, "H", "ESP", "KSA", "2026-06-21T16:00:00Z"],
  [39, "G", "BEL", "IRN", "2026-06-21T16:00:00Z"],
  [40, "G", "NZL", "EGY", "2026-06-21T22:00:00Z"],
  // Lunes 22
  [41, "I", "NOR", "SEN", "2026-06-23T00:00:00Z"],
  [42, "I", "FRA", "IRQ", "2026-06-22T22:00:00Z"],
  [43, "J", "ARG", "AUT", "2026-06-22T17:00:00Z"],
  [44, "J", "JOR", "ALG", "2026-06-23T01:00:00Z"],
  // Martes 23
  [45, "L", "ENG", "GHA", "2026-06-23T20:00:00Z"],
  [46, "L", "PAN", "CRO", "2026-06-23T23:00:00Z"],
  [47, "K", "POR", "UZB", "2026-06-23T16:00:00Z"],
  [48, "K", "COL", "COD", "2026-06-24T00:00:00Z"],
  // Miércoles 24 (cierre simultáneo)
  [49, "C", "SCO", "BRA", "2026-06-25T01:00:00Z"],
  [50, "C", "MAR", "HAI", "2026-06-25T01:00:00Z"],
  [51, "B", "SUI", "CAN", "2026-06-24T19:00:00Z"],
  [52, "B", "BIH", "QAT", "2026-06-24T19:00:00Z"],
  [53, "A", "CZE", "MEX", "2026-06-25T02:00:00Z"],
  [54, "A", "RSA", "KOR", "2026-06-25T02:00:00Z"],
  // Jueves 25
  [55, "E", "CUW", "CIV", "2026-06-25T20:00:00Z"],
  [56, "E", "ECU", "GER", "2026-06-25T20:00:00Z"],
  [57, "F", "JPN", "SWE", "2026-06-25T22:00:00Z"],
  [58, "F", "TUN", "NED", "2026-06-25T22:00:00Z"],
  [59, "D", "TUR", "USA", "2026-06-25T23:00:00Z"],
  [60, "D", "PAR", "AUS", "2026-06-25T23:00:00Z"],
  // Viernes 26
  [61, "I", "NOR", "FRA", "2026-06-26T19:00:00Z"],
  [62, "I", "SEN", "IRQ", "2026-06-26T19:00:00Z"],
  [63, "G", "EGY", "IRN", "2026-06-27T00:00:00Z"],
  [64, "G", "NZL", "BEL", "2026-06-27T00:00:00Z"],
  [65, "H", "CPV", "KSA", "2026-06-26T22:00:00Z"],
  [66, "H", "URU", "ESP", "2026-06-26T22:00:00Z"],
  // Sábado 27
  [67, "L", "PAN", "ENG", "2026-06-27T21:00:00Z"],
  [68, "L", "CRO", "GHA", "2026-06-27T21:00:00Z"],
  [69, "J", "ALG", "AUT", "2026-06-28T01:00:00Z"],
  [70, "J", "JOR", "ARG", "2026-06-28T01:00:00Z"],
  [71, "K", "COL", "POR", "2026-06-27T23:30:00Z"],
  [72, "K", "COD", "UZB", "2026-06-27T23:30:00Z"],
];

// [nº, etapa, slot local, slot visitante, fecha UTC, sede]
// Slots: "1A" ganador de grupo, "2A" segundo, "3:ABCDF" mejor tercero de esos grupos, "W73" ganador del partido 73
const KO_MATCHES: [number, string, string, string, string, string][] = [
  [73, "R32", "2A", "2B", "2026-06-28T20:00:00Z", "Los Ángeles"],
  [74, "R32", "1E", "3:ABCDF", "2026-06-29T17:00:00Z", "Boston"],
  [75, "R32", "1F", "2C", "2026-06-29T20:00:00Z", "Monterrey"],
  [76, "R32", "1C", "2F", "2026-06-29T23:00:00Z", "Houston"],
  [77, "R32", "1I", "3:CDFGH", "2026-06-30T17:00:00Z", "Nueva York"],
  [78, "R32", "2E", "2I", "2026-06-30T20:00:00Z", "Dallas"],
  [79, "R32", "1A", "3:CEFHI", "2026-06-30T23:00:00Z", "Ciudad de México"],
  [80, "R32", "1L", "3:EHIJK", "2026-07-01T17:00:00Z", "Atlanta"],
  [81, "R32", "1D", "3:BEFIJ", "2026-07-01T20:00:00Z", "San Francisco"],
  [82, "R32", "1G", "3:AEHIJ", "2026-07-01T23:00:00Z", "Seattle"],
  [83, "R32", "2K", "2L", "2026-07-02T17:00:00Z", "Toronto"],
  [84, "R32", "1H", "2J", "2026-07-02T20:00:00Z", "Los Ángeles"],
  [85, "R32", "1B", "3:EFGIJ", "2026-07-02T23:00:00Z", "Vancouver"],
  [86, "R32", "1J", "2H", "2026-07-03T17:00:00Z", "Miami"],
  [87, "R32", "1K", "3:DEIJL", "2026-07-03T20:00:00Z", "Kansas City"],
  [88, "R32", "2D", "2G", "2026-07-03T23:00:00Z", "Dallas"],
  [89, "R16", "W74", "W77", "2026-07-04T17:00:00Z", "Filadelfia"],
  [90, "R16", "W73", "W75", "2026-07-04T21:00:00Z", "Houston"],
  [91, "R16", "W76", "W78", "2026-07-05T17:00:00Z", "Ciudad de México"],
  [92, "R16", "W79", "W80", "2026-07-05T21:00:00Z", "Nueva York"],
  [93, "R16", "W83", "W84", "2026-07-06T17:00:00Z", "Dallas"],
  [94, "R16", "W81", "W82", "2026-07-06T21:00:00Z", "Seattle"],
  [95, "R16", "W86", "W88", "2026-07-07T17:00:00Z", "Atlanta"],
  [96, "R16", "W85", "W87", "2026-07-07T21:00:00Z", "Vancouver"],
  [97, "QF", "W89", "W90", "2026-07-09T20:00:00Z", "Boston"],
  [98, "QF", "W93", "W94", "2026-07-10T20:00:00Z", "Los Ángeles"],
  [99, "QF", "W91", "W92", "2026-07-11T17:00:00Z", "Kansas City"],
  [100, "QF", "W95", "W96", "2026-07-11T21:00:00Z", "Miami"],
  [101, "SF", "W97", "W98", "2026-07-14T20:00:00Z", "Dallas"],
  [102, "SF", "W99", "W100", "2026-07-15T20:00:00Z", "Atlanta"],
  [103, "THIRD", "L101", "L102", "2026-07-18T20:00:00Z", "Miami"],
  [104, "FINAL", "W101", "W102", "2026-07-19T19:00:00Z", "Nueva York"],
];

function hashPassword(password: string) {
  return createHash("sha256").update(`polla-mundial:${password}`).digest("hex");
}

async function main() {
  for (const [id, name, flagCode, group] of TEAMS) {
    await prisma.team.upsert({
      where: { id },
      update: { name, flagCode, group },
      create: { id, name, flagCode, group },
    });
  }

  for (const [id, group, home, away, kickoff] of GROUP_MATCHES) {
    await prisma.match.upsert({
      where: { id },
      update: {},
      create: {
        id,
        stage: "GROUP",
        group,
        kickoff: new Date(kickoff),
        venue: "",
        homeTeamId: home,
        awayTeamId: away,
      },
    });
  }

  for (const [id, stage, homeSlot, awaySlot, kickoff, venue] of KO_MATCHES) {
    await prisma.match.upsert({
      where: { id },
      update: {},
      create: {
        id,
        stage,
        kickoff: new Date(kickoff),
        venue,
        homeSlot,
        awaySlot,
      },
    });
  }

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      displayName: "Admin",
      passwordHash: hashPassword("admin123"),
      isAdmin: true,
    },
  });

  console.log("Seed completo: 48 equipos, 104 partidos, usuario admin/admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
