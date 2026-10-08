import path from "node:path";

import sharp from "sharp";

export const FONT_FAMILY = "Noto Sans";

const FONTS_DIR =
  process.env.FONTS_DIR ?? path.resolve("assets/fonts");

const FONT_FILES = [
  "NotoSans-Regular.ttf",
  "NotoSans-SemiBold.ttf",
  "NotoSans-Bold.ttf",
  "NotoColorEmoji.ttf",
];

let registration: Promise<void> | undefined;

// vips adds a fontfile to fontconfig the first time it is used, after which
// the family (and emoji fallback) is available to every text render.
export function registerFonts(): Promise<void> {
  registration ??= (async () => {
    for (const file of FONT_FILES) {
      await sharp({
        text: {
          text: ".",
          font: FONT_FAMILY,
          fontfile: path.join(FONTS_DIR, file),
        },
      })
        .png()
        .toBuffer();
    }
  })().catch((error: unknown) => {
    registration = undefined;
    throw error;
  });

  return registration;
}
