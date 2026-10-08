import sharp, { type OverlayOptions } from "sharp";

import { FONT_FAMILY, registerFonts } from "./fonts.js";

const PANGO_SCALE = 1024;
const STRUT_TOP = '<span size="1024" alpha="1">|\n</span>';
const STRUT_BOTTOM = '<span size="1024" alpha="1">\n|</span>';
const STRUT_OVERHEAD = 2;

export interface TextStyle {
  size: number;
  lineHeight: number;
  color: string;
  weight?: number;
}

export interface TextBlock {
  buffer: Buffer;
  width: number;
  height: number;
}

export async function renderText(
  markup: string,
  style: TextStyle,
  width?: number,
): Promise<TextBlock> {
  await registerFonts();

  const body =
    `<span foreground="${style.color}"` +
    ` weight="${style.weight ?? 400}"` +
    ` line_height="${Math.round(style.lineHeight * PANGO_SCALE)}">` +
    `${markup}</span>`;

  const { data, info } = await sharp({
    text: {
      text: STRUT_TOP + body + STRUT_BOTTOM,
      font: `${FONT_FAMILY} ${style.size}`,
      dpi: 72,
      width: width === undefined ? undefined : Math.round(width),
      wrap: "word-char",
      rgba: true,
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: data,
    width: info.width,
    height: info.height - 2 * STRUT_OVERHEAD,
  };
}

export function place(
  block: TextBlock,
  left: number,
  top: number,
): OverlayOptions {
  return {
    input: block.buffer,
    left: Math.round(left),
    top: Math.round(top - STRUT_OVERHEAD),
  };
}

export function pangoSize(size: number): number {
  return Math.round(size * PANGO_SCALE);
}

export function escapeMarkup(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
