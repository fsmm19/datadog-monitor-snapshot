import {
  app,
  HttpRequest,
  InvocationContext,
  type HttpResponseInit,
} from "@azure/functions";

import { renderMonitorEvent } from "../render/render-monitor-event.js";
import { MonitorEventImageRequest } from "../render/types.js";

export async function capture(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, {
      error: "INVALID_JSON",
      message: "Request body must contain valid JSON.",
    });
  }

  const validation = parseRequest(body);

  if ("error" in validation) {
    return jsonResponse(400, {
      error: "INVALID_REQUEST",
      message: validation.error,
    });
  }

  try {
    const image = await renderMonitorEvent(validation.event);

    return {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Length": image.length.toString(),
        "Cache-Control": "no-store",
      },
      body: image,
    };
  } catch (error) {
    context.error("Could not render monitor event", error);

    return jsonResponse(500, {
      error: "RENDER_FAILED",
      message: "Could not render the monitor event.",
    });
  }
}

function parseRequest(
  body: unknown,
): { event: MonitorEventImageRequest } | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "Request body must be a JSON object." };
  }

  const { timestamp, status, group, title, message } =
    body as Record<string, unknown>;

  if (
    (typeof timestamp !== "string" && typeof timestamp !== "number") ||
    Number.isNaN(new Date(timestamp).getTime())
  ) {
    return { error: "timestamp must be an ISO date or epoch milliseconds." };
  }

  for (const [field, value] of Object.entries({ status, title, message })) {
    if (typeof value !== "string") {
      return { error: `${field} must be a string.` };
    }
  }

  if (group !== undefined && group !== null && typeof group !== "string") {
    return { error: "group must be a string or null." };
  }

  return {
    event: {
      timestamp,
      status: status as string,
      group,
      title: title as string,
      message: message as string,
    },
  };
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
