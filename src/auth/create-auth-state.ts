import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { chromium } from "playwright";

const DATADOG_URL = process.env.DATADOG_URL ?? "https://app.datadoghq.com";
const AUTH_FILE = resolve("playwright/.auth/datadog.json");

async function main() {
  await mkdir(dirname(AUTH_FILE), { recursive: true });

  const browser = await chromium.launch({
    headless: false,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(DATADOG_URL);

  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    await readline.question(
      "Completa el inicio de sesión SSO en el navegador y presiona Enter aquí cuando estés autenticado...",
    );

    await context.storageState({
      path: AUTH_FILE,
      indexedDB: true,
    });

    console.log(`Estado de autenticación guardado en: ${AUTH_FILE}`);
  } finally {
    readline.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error("No fue posible guardar el estado de autenticación");
  console.error(error);
  process.exitCode = 1;
});
