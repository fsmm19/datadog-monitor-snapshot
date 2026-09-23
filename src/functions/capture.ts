import {
  app,
  HttpRequest,
  InvocationContext,
  type HttpResponseInit,
} from "@azure/functions";

import {
  captureMonitorEvent,
  InvalidAlertUrlError,
} from "../capture/capture-monitor-event.js";

interface CaptureRequest {
  alertUrl?: unknown;
}

export async function capture(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  let body: CaptureRequest;

  try {
    body = (await request.json()) as CaptureRequest;
  } catch {
    return jsonResponse(400, {
      error: "INVALID_JSON",
      message: "Request body must contain valid JSON.",
    });
  }

  if (typeof body.alertUrl !== "string" || body.alertUrl.trim().length === 0) {
    return jsonResponse(400, {
      error: "INVALID_REQUEST",
      message: "alertUrl is required.",
    });
  }

  try {
    const screenshot = await captureMonitorEvent({
      alertUrl: body.alertUrl,
    });

    return {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Length": screenshot.length.toString(),
        "Cache-Control": "no-store",
      },
      body: screenshot,
    };
  } catch (error) {
    if (error instanceof InvalidAlertUrlError) {
      return jsonResponse(400, {
        error: "INVALID_ALERT_URL",
        message: error.message,
      });
    }

    context.error("Could not capture monitor event", error);

    return jsonResponse(500, {
      error: "CAPTURE_FAILED",
      message: "Could not capture the monitor event.",
    });
  }
}

function jsonResponse(status: number, body: object): HttpResponseInit {
  return {
    status,
    headers: {
      "Content-Type": "application/json",
    },
    jsonBody: body,
  };
}

app.http("capture", {
  methods: ["POST"],
  authLevel: "function",
  route: "capture",
  handler: capture,
});
