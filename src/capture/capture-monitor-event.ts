import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const DATADOG_URL = process.env.DATADOG_URL ?? "https://app.datadoghq.com";
const AUTH_FILE = resolve("playwright/.auth/datadog.json");

export interface CaptureMonitorEventInput {
  alertUrl: string;
}

export async function captureMonitorEvent({
  alertUrl,
}: CaptureMonitorEventInput) {
  const browser = await chromium.launch({
    headless: false,
  });

  const context = await browser.newContext({
    storageState: AUTH_FILE,
  });

  const page = await context.newPage();

  try {
    const url = new URL(alertUrl, DATADOG_URL);

    await page.goto(url.toString(), { waitUntil: "domcontentloaded" });

    const eventTimeline = page.locator(
      ".monitors-status-page_status__event-list",
    );
    const eventDetails = page.getByText("Event DetailsMessage");

    await eventTimeline.waitFor({ state: "visible" });
    await eventDetails.waitFor({ state: "visible" });

    const eventTimelineBox = await eventTimeline.boundingBox();
    const eventDetailsBox = await eventDetails.boundingBox();

    if (!eventTimelineBox || !eventDetailsBox) {
      throw new Error("Unable to determine screenshot bounds");
    }

    const x = Math.min(eventTimelineBox.x, eventDetailsBox.x);
    const y = Math.min(eventTimelineBox.y, eventDetailsBox.y);

    const right = Math.max(
      eventTimelineBox.y + eventTimelineBox.height,
      eventDetailsBox.y + eventDetailsBox.height,
    );

    const bottom = Math.max(
      eventTimelineBox.y + eventTimelineBox.height,
      eventDetailsBox.y + eventDetailsBox.height,
    );

    // const screenshot = await page.screenshot({
    //   type: "png",
    //   clip: {
    //     x,
    //     y,
    //     width: right - x,
    //     height: bottom - y,
    //   },
    // });

    await page
      .locator(".monitors-status-page_status__events-section")
      .screenshot({
        path: "output/capture.png",
      });

    // await writeFile("output/capture.png", screenshot);

    console.log({
      eventTimelineBox,
      eventDetailsBox,
    });
  } finally {
    await context.close();
    await browser.close();
  }
}
