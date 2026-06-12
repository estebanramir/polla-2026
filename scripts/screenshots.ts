/** Capturas locales para revisión visual. Uso: npx tsx scripts/screenshots.ts <cookie> */
import puppeteer from "puppeteer-core";

const cookie = process.argv[2]; // valor de polla_session
const BASE = "http://localhost:3344";

async function main() {
  const browser = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle0" });
  await page.screenshot({ path: "/tmp/polla-login.png" });

  if (cookie) {
    await browser.setCookie({
      name: "polla_session",
      value: cookie,
      domain: "localhost",
      path: "/",
      httpOnly: true,
    });
    for (const [path, name] of [
      ["/", "home"],
      ["/tabla", "tabla"],
      ["/premios", "premios"],
      ["/admin", "admin"],
    ] as const) {
      await page.goto(`${BASE}${path}`, { waitUntil: "networkidle0" });
      await page.screenshot({ path: `/tmp/polla-${name}.png` });
    }
  }
  await browser.close();
  console.log("listo");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
