import { resolve } from "node:path";
import { chromium } from "playwright";

const DATADOG_URL = process.env.DATADOG_URL ?? "https://app.datadoghq.com";
const AUTH_FILE = resolve("playwright/.auth/datadog.json");

async function main() {
  const browser = await chromium.launch({
    headless: false,
  });

  const context = await browser.newContext({
    storageState: AUTH_FILE,
  });

  const page = await context.newPage();

  await page.goto(DATADOG_URL, {
    waitUntil: "domcontentloaded",
  });

  console.log("URL actual:", page.url());

  await page.waitForTimeout(30_000);

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
