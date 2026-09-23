import { createServer } from "node:http";
import { captureMonitorEvent } from "./capture/capture-monitor-event.js";

const PORT = Number(process.env.PORT ?? 3000);

interface CaptureRequest {
  alertUrl: string;
}

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/capture") {
    response.writeHead(404, {
      "Content-Type": "application/json",
    });

    response.end(
      JSON.stringify({
        error: "NOT_FOUND",
      }),
    );

    return;
  }

  try {
    const body = await readJsonBody<CaptureRequest>(request);

    if (
      typeof body.alertUrl !== "string" ||
      body.alertUrl.trim().length === 0
    ) {
      response.writeHead(400, {
        "Content-Type": "application/json",
      });

      response.end(
        JSON.stringify({
          error: "INVALID_ALERT_URL",
          message: "alertUrl is required.",
        }),
      );

      return;
    }

    const screenshot = await captureMonitorEvent({
      alertUrl: body.alertUrl,
    });

    response.writeHead(200, {
      "Content-Type": "image/png",
      "Content-Length": screenshot.length,
      "Cache-Control": "no-store",
    });

    response.end(screenshot);
  } catch (error) {
    console.error(error);

    response.writeHead(500, {
      "Content-Type": "application/json",
    });

    response.end(
      JSON.stringify({
        error: "CAPTURE_FAILED",
        message: "Could not capture the monitor event.",
      }),
    );
  }
});

server.listen(PORT, () => {
  console.log(`Capture API listening on http://localhost:${PORT}`);
});

async function readJsonBody<T>(request: NodeJS.ReadableStream): Promise<T> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk));
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as T;
}
