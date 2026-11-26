import { chromium } from "playwright";

const BASE_URL = "http://127.0.0.1:5180";
const ROUTES = [
  "/",
  "/demo/seo-03",
  "/audit",
  "/decay",
  "/serplab",
  "/dashboard",
  "/settings/agency",
];

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

async function runVisualAudit() {
  console.log("=== STARTING PLAYWRIGHT VISUAL & RESPONSIVE AUDIT ===");
  const browser = await chromium.launch();
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const vp of VIEWPORTS) {
    console.log(`\n--- Auditing Viewport: ${vp.name.toUpperCase()} (${vp.width}x${vp.height}) ---`);
    const page = await browser.newPage({
      viewport: { width: vp.width, height: vp.height },
    });

    const pageErrors = [];
    const consoleWarnings = [];

    page.on("pageerror", (err) => {
      pageErrors.push(err.message);
    });

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        pageErrors.push(msg.text());
      } else if (msg.type() === "warning") {
        consoleWarnings.push(msg.text());
      }
    });

    for (const route of ROUTES) {
      const url = `${BASE_URL}${route}`;
      try {
        const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
        const status = resp?.status() ?? 0;
        console.log(`[${vp.name}] ${route} -> Status ${status}`);

        if (status >= 400) {
          console.error(`  FAIL: HTTP ${status} on ${route}`);
          totalErrors++;
        }

        // Wait a beat for hydrate/animations
        await page.waitForTimeout(300);

        // Check for horizontal overflow (broken responsiveness)
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
        if (scrollWidth > clientWidth + 2) {
          console.warn(
            `  WARN: Horizontal scroll detected on ${route}: scrollWidth=${scrollWidth} > clientWidth=${clientWidth}`,
          );
          totalWarnings++;
        }

        // Check contrast & computed style of key elements if on home or serplab
        if (route === "/") {
          const heroInput = await page.$("input");
          if (heroInput) {
            await heroInput.focus();
            const outline = await heroInput.evaluate((el) => {
              const cs = window.getComputedStyle(el);
              return {
                borderColor: cs.borderColor,
                outlineColor: cs.outlineColor,
                boxShadow: cs.boxShadow,
              };
            });
            console.log(`  [Hero Input Focus Style]:`, outline);
          }
        }
      } catch (err) {
        console.error(`  ERROR on ${route}:`, err.message);
        totalErrors++;
      }
    }

    if (pageErrors.length > 0) {
      console.error(`[${vp.name}] Uncaught runtime/console errors:`, pageErrors);
      totalErrors += pageErrors.length;
    } else {
      console.log(`[${vp.name}] Clean run: 0 console runtime errors.`);
    }

    await page.close();
  }

  await browser.close();
  console.log(`\n=== AUDIT FINISHED: ${totalErrors} errors, ${totalWarnings} warnings ===`);
  if (totalErrors > 0) {
    process.exit(1);
  }
}

runVisualAudit().catch((e) => {
  console.error("FATAL AUDIT ERROR:", e);
  process.exit(1);
});
