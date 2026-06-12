/** Prueba E2E con el navegador real: registro → pronóstico → resultado admin → puntos. */
import puppeteer from "puppeteer-core";
import { PrismaClient } from "@prisma/client";

const BASE = "http://localhost:3344";
const prisma = new PrismaClient();

function fail(msg: string): never {
  throw new Error(`FALLO E2E: ${msg}`);
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // 1. Registro
  await page.goto(`${BASE}/registro`, { waitUntil: "networkidle0" });
  await page.type('input[name="displayName"]', "Tester E2E");
  await page.type('input[name="username"]', "tester_e2e");
  await page.type('input[name="password"]', "test1234");
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle0" }),
    page.click("button.btn"),
  ]);
  if (!page.url().endsWith("/")) fail(`registro no redirigió al home: ${page.url()}`);
  const saludo = await page.$eval("h1", (el) => el.textContent);
  if (!saludo?.includes("TESTER E2E")) fail("el home no saluda al usuario");
  console.log("OK: registro y login automático");

  // 2. Pronóstico en el primer partido abierto (P3)
  const card = await page.$$eval(".card", (cards) => {
    const open = cards.find((c) => c.querySelector(".score-input"));
    return open?.querySelector("span")?.textContent ?? "";
  });
  console.log(`   primer partido abierto: ${card}`);
  const inputs = await page.$$(".score-input");
  await inputs[0].type("2");
  await inputs[1].type("1");
  // botón Guardar de esa tarjeta
  await page.evaluate(() => {
    const openCard = [...document.querySelectorAll(".card")].find((c) =>
      c.querySelector(".score-input")
    )!;
    (openCard.querySelector("button.btn") as HTMLButtonElement).click();
  });
  await page.waitForFunction(
    () => document.body.textContent?.includes("Guardado ✓"),
    { timeout: 10000 }
  );
  console.log("OK: pronóstico 2-1 guardado");

  const pred = await prisma.prediction.findFirst({
    where: { user: { username: "tester_e2e" } },
  });
  if (!pred || pred.homeScore !== 2 || pred.awayScore !== 1) fail("la predicción no quedó en BD");
  const matchId = pred.matchId;
  console.log(`OK: predicción en BD para P${matchId}`);
  const originalKickoff = (await prisma.match.findUnique({ where: { id: matchId } }))!
    .kickoff;

  // 3. Como admin: cargar resultado 2-1 a ese partido (vía BD directa equivale a la acción)
  await prisma.match.update({
    where: { id: matchId },
    data: { homeScore: 2, awayScore: 1 },
  });

  // 4. Ranking muestra 5 puntos (exacto)
  await page.goto(`${BASE}/tabla`, { waitUntil: "networkidle0" });
  const fila = await page.$$eval("tbody tr", (rows) =>
    rows.map((r) => r.textContent).find((t) => t?.includes("Tester E2E"))
  );
  if (!fila?.includes("5")) fail(`el ranking no muestra 5 pts: ${fila}`);
  console.log("OK: ranking muestra 5 puntos por marcador exacto");

  // 5. Bloqueo: intentar cambiar un partido ya iniciado debe fallar
  await prisma.match.update({
    where: { id: matchId },
    data: { kickoff: new Date(Date.now() - 60_000) },
  });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  const sigueAbierto = await page.evaluate((id) => {
    return [...document.querySelectorAll(".card")].some(
      (c) => c.textContent?.includes(`P${id} ·`) && c.querySelector(".score-input")
    );
  }, matchId);
  if (sigueAbierto) fail("el partido iniciado sigue mostrando inputs");
  console.log("OK: partido iniciado aparece cerrado, sin inputs");

  await browser.close();

  // Limpieza
  await prisma.user.deleteMany({ where: { username: "tester_e2e" } });
  await prisma.match.update({
    where: { id: matchId },
    data: { homeScore: null, awayScore: null, kickoff: originalKickoff },
  });
  console.log("\nE2E completo y datos de prueba eliminados.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
