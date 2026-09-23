import { resolve } from "node:path";
import { chromium } from "playwright";

const DATADOG_URL = process.env.DATADOG_URL ?? "https://app.datadoghq.com";
const AUTH_FILE = resolve("playwright/.auth/datadog.json");
const TIMEZONE_ID = "America/Bogota";

export interface CaptureMonitorEventInput {
  alertUrl: string;
}

export async function captureMonitorEvent({
  alertUrl,
}: CaptureMonitorEventInput): Promise<Buffer> {
  const browser = await chromium.launch();

  const context = await browser.newContext({
    storageState: AUTH_FILE,
    timezoneId: TIMEZONE_ID,
    viewport: {
      width: 1440,
      height: 1600,
    },
  });

  const page = await context.newPage();

  try {
    const url = new URL(alertUrl, DATADOG_URL);

    await page.goto(url.toString(), {
      waitUntil: "domcontentloaded",
    });

    const timeline = page.locator(".monitors-status-page_status__event-list");

    const details = page.getByRole("main");

    const detailsContent = page.locator(
      ".monitors-status-page_status__event-details-main-content",
    );

    await Promise.all([
      timeline.waitFor({ state: "visible" }),
      details.waitFor({ state: "visible" }),
      detailsContent.waitFor({ state: "visible" }),
    ]);

    await details.scrollIntoViewIfNeeded();

    const [timelineBox, detailsBox, detailsContentBox] = await Promise.all([
      timeline.boundingBox(),
      details.boundingBox(),
      detailsContent.boundingBox(),
    ]);

    if (!timelineBox || !detailsBox || !detailsContentBox) {
      throw new Error("Could not determine screenshot bounds");
    }

    const x = timelineBox.x;
    const y = Math.min(timelineBox.y, detailsBox.y);

    const right = detailsBox.x + detailsBox.width;
    const bottom = detailsContentBox.y + detailsContentBox.height;

    const width = right - x;
    const height = bottom - y;

    if (width <= 0 || height <= 0) {
      throw new Error("Invalid screenshot bounds");
    }

    return await page.screenshot({
      type: "png",
      animations: "disabled",
      caret: "hide",
      path: "output/capture.png",
      clip: {
        x,
        y,
        width,
        height,
      },
      style: `
        header,
        nav,
        .single-page-app_navbar_top-bar {
          visibility: hidden !important;
        }
      `,
    });
  } finally {
    await context.close();
    await browser.close();
  }
}
