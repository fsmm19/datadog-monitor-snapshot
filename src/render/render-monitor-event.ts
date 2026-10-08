import sharp, { type OverlayOptions } from "sharp";

import {
  type MarkdownBlock,
  parseMarkdown,
} from "./markdown-to-pango.js";
import {
  escapeMarkup,
  place,
  renderText,
  type TextStyle,
} from "./text.js";
import {
  MonitorEventImageRequest,
  MonitorEventStatus,
} from "./types.js";

const WIDTH = 1329;
const MIN_HEIGHT = 260;
const BOTTOM_PADDING = 16;
const DIVIDER_X = 417;

const TIMELINE_X = 48;
const CARD_X = 25;
const CARD_Y = 88;
const CARD_WIDTH = 366;
const CARD_CONTENT_X = 72;
const GROUP_MAX_WIDTH = 226;

const DETAILS_X = 453;
const DETAILS_WIDTH = 816;
const TITLE_GAP = 23;
const BLOCK_GAP = 15;
const LIST_ITEM_GAP = 7;
const LIST_INDENT = 36;

const COLORS = {
  text: "#232f3a",
  muted: "#66717c",
  accent: "#1167c4",
  divider: "#e4e7eb",
  card: "#eaf4fb",
  chip: "#e9ecf0",
  bullet: "#8a959f",
  icon: "#5c6873",
};

const STYLES = {
  timelineTitle: { size: 19.5, weight: 600, lineHeight: 26, color: COLORS.text },
  timestamp: { size: 18, lineHeight: 24, color: COLORS.muted },
  badge: { size: 16, weight: 600, lineHeight: 22, color: "#ffffff" },
  group: { size: 17, lineHeight: 24, color: COLORS.text },
  detailsTitle: { size: 23, weight: 600, lineHeight: 30, color: COLORS.text },
  label: { size: 19.5, lineHeight: 26, color: COLORS.muted },
  eventTitle: { size: 22.75, weight: 600, lineHeight: 31, color: COLORS.text },
  h1: { size: 23, weight: 600, lineHeight: 34, color: COLORS.text },
  h2: { size: 20.5, weight: 600, lineHeight: 32, color: COLORS.text },
  body: { size: 21, lineHeight: 31.7, color: COLORS.text },
} satisfies Record<string, TextStyle>;

interface Section {
  overlays: OverlayOptions[];
  shapes: string;
  bottom: number;
}

export async function renderMonitorEvent(
  event: MonitorEventImageRequest,
): Promise<Buffer> {
  const [timeline, details] = await Promise.all([
    renderTimeline(event),
    renderDetails(event),
  ]);

  const height = Math.max(
    MIN_HEIGHT,
    Math.ceil(
      Math.max(timeline.bottom, details.bottom) +
        BOTTOM_PADDING,
    ),
  );

  const background = `
    <svg width="${WIDTH}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#ffffff"/>
      <line x1="${DIVIDER_X}" y1="0" x2="${DIVIDER_X}" y2="${height}"
        stroke="${COLORS.divider}" stroke-width="1.5"/>
      ${timeline.shapes}
      ${details.shapes}
    </svg>
  `;

  return sharp({
    create: {
      width: WIDTH,
      height,
      channels: 4,
      background: "#ffffff",
    },
  })
    .composite([
      { input: Buffer.from(background), top: 0, left: 0 },
      ...timeline.overlays,
      ...details.overlays,
    ])
    .png()
    .toBuffer();
}

async function renderTimeline(
  event: MonitorEventImageRequest,
): Promise<Section> {
  const status = normalizeStatus(event.status);
  const badge = statusStyle(status);

  const [title, timestamp, badgeText, group] =
    await Promise.all([
      renderText("Event Timeline", STYLES.timelineTitle),
      renderText(
        escapeMarkup(formatTimestamp(event.timestamp)),
        STYLES.timestamp,
      ),
      renderText(status.replace("_", " "), {
        ...STYLES.badge,
        color: badge.color,
      }),
      event.group ? renderGroup(event.group) : undefined,
    ]);

  const cardHeight = group ? 92 : 62;
  const cardBottom = CARD_Y + cardHeight;

  const badgeX = CARD_CONTENT_X + timestamp.width + 12;
  const badgeY = 100;
  const badgeWidth = badgeText.width + 18;
  const badgeHeight = 29;

  const overlays = [
    place(title, TIMELINE_X, 49),
    place(timestamp, CARD_CONTENT_X, 105),
    place(
      badgeText,
      badgeX + (badgeWidth - badgeText.width) / 2,
      badgeY + (badgeHeight - badgeText.height) / 2,
    ),
  ];

  let shapes = `
    <rect x="${CARD_X}" y="${CARD_Y}" width="${CARD_WIDTH}" height="${cardHeight}"
      rx="4" fill="${COLORS.card}" stroke="${COLORS.accent}" stroke-width="3"/>
    <line x1="50" y1="116" x2="50" y2="${cardBottom}"
      stroke="${COLORS.accent}" stroke-width="2"/>
    <circle cx="50" cy="116" r="5.5" fill="${COLORS.accent}"/>
    <rect x="${badgeX}" y="${badgeY}" width="${badgeWidth}" height="${badgeHeight}"
      rx="4" fill="${badge.background}"/>
    <path d="M356 105.5 L372 121.5 M372 105.5 L356 121.5"
      stroke="${COLORS.icon}" stroke-width="1.7" stroke-linecap="round"/>
  `;

  if (group) {
    shapes += `
      <rect x="${CARD_CONTENT_X}" y="141" width="${group.width + 16}" height="25"
        rx="3" fill="${COLORS.chip}"/>
    `;
    overlays.push(place(group, CARD_CONTENT_X + 6, 141.5));
  }

  return { overlays, shapes, bottom: cardBottom };
}

async function renderGroup(group: string) {
  const markup = (value: string) => {
    const separator = value.indexOf(":");
    const escaped = escapeMarkup(value);

    if (separator < 0) {
      return escaped;
    }

    const key = escapeMarkup(value.slice(0, separator + 1));

    return `<span foreground="${COLORS.muted}">${key}</span>${escaped.slice(key.length)}`;
  };

  const full = await renderText(markup(group), STYLES.group);

  if (full.width <= GROUP_MAX_WIDTH) {
    return full;
  }

  // Longest prefix that still fits with the ellipsis.
  let low = 0;
  let high = group.length;
  let best = await renderText("...", STYLES.group);

  while (low <= high) {
    const length = Math.floor((low + high) / 2);
    const candidate = await renderText(
      markup(`${group.slice(0, length)}...`),
      STYLES.group,
    );

    if (candidate.width <= GROUP_MAX_WIDTH) {
      best = candidate;
      low = length + 1;
    } else {
      high = length - 1;
    }
  }

  return best;
}

async function renderDetails(
  event: MonitorEventImageRequest,
): Promise<Section> {
  const [heading, label, title] = await Promise.all([
    renderText("Event Details", STYLES.detailsTitle),
    renderText("Message", STYLES.label),
    renderText(
      escapeMarkup(event.title),
      STYLES.eventTitle,
      DETAILS_WIDTH,
    ),
  ]);

  const section: Section = {
    overlays: [
      place(heading, DETAILS_X, 37),
      place(label, DETAILS_X, 90),
      place(title, DETAILS_X, 128),
    ],
    shapes: "",
    bottom: 128 + title.height,
  };

  const blocks = parseMarkdown(event.message);

  for (const [index, block] of blocks.entries()) {
    section.bottom += index === 0 ? TITLE_GAP : BLOCK_GAP;
    section.bottom = await renderBlock(
      block,
      section.bottom,
      section,
    );
  }

  return section;
}

async function renderBlock(
  block: MarkdownBlock,
  top: number,
  section: Section,
): Promise<number> {
  if (block.type !== "list") {
    const style =
      block.type === "paragraph"
        ? STYLES.body
        : block.level === 1
          ? STYLES.h1
          : STYLES.h2;

    const text = await renderText(
      block.markup,
      style,
      DETAILS_WIDTH,
    );

    section.overlays.push(place(text, DETAILS_X, top));

    return top + text.height;
  }

  const items = await Promise.all(
    block.items.map((item) =>
      renderText(
        item,
        STYLES.body,
        DETAILS_WIDTH - LIST_INDENT,
      ),
    ),
  );

  let y = top;

  for (const [index, item] of items.entries()) {
    if (index > 0) {
      y += LIST_ITEM_GAP;
    }

    if (block.ordered) {
      const number = await renderText(
        `${index + 1}.`,
        STYLES.body,
      );

      section.overlays.push(
        place(number, DETAILS_X + 12, y),
      );
    } else {
      section.shapes += `
        <circle cx="${DETAILS_X + 18}" cy="${y + STYLES.body.lineHeight / 2}"
          r="2.75" fill="${COLORS.bullet}"/>
      `;
    }

    section.overlays.push(
      place(item, DETAILS_X + LIST_INDENT, y),
    );

    y += item.height;
  }

  return y;
}

function normalizeStatus(
  value: string,
): MonitorEventStatus {
  switch (
    value
      .trim()
      .toUpperCase()
      .replace(/ /g, "_")
  ) {
    case "ALERT":
    case "ERROR":
      return "ALERT";

    case "WARN":
    case "WARNING":
      return "WARN";

    case "OK":
    case "RECOVERED":
      return "OK";

    case "NO_DATA":
      return "NO_DATA";

    default:
      return "UNKNOWN";
  }
}

function statusStyle(status: MonitorEventStatus) {
  switch (status) {
    case "ALERT":
      return { background: "#e5304a", color: "#ffffff" };

    case "WARN":
      return { background: "#f59e0b", color: "#ffffff" };

    case "OK":
      return { background: "#3eb06e", color: "#ffffff" };

    default:
      return { background: "#c9ced6", color: COLORS.text };
  }
}

function formatTimestamp(
  timestamp: string | number,
): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone:
      process.env.DISPLAY_TIME_ZONE ??
      "America/Bogota",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  })
    .format(new Date(timestamp))
    .replace("AM", "am")
    .replace("PM", "pm");
}
