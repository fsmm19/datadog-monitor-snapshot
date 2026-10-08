import { escapeMarkup, pangoSize } from "./text.js";

export type MarkdownBlock =
  | { type: "heading"; level: number; markup: string }
  | { type: "paragraph"; markup: string }
  | { type: "list"; ordered: boolean; items: string[] };

const LINK_COLOR = "#1a6dd1";

const HANDLE_SIZE = 19.5;

export function parseMarkdown(markdown: string): MarkdownBlock[] {
  const lines = markdown
    .trim()
    .replace(/^%%%\s*/, "")
    .replace(/\s*%%%$/, "")
    .split("\n");

  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  let list: Extract<MarkdownBlock, { type: "list" }> | undefined;

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({
        type: "paragraph",
        markup: formatInline(paragraph.join(" ")),
      });
      paragraph = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      list = undefined;
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);

    if (heading) {
      flushParagraph();
      list = undefined;
      blocks.push({
        type: "heading",
        level: heading[1].length,
        markup: formatInline(heading[2]),
      });
      continue;
    }

    const item =
      /^([-*+]|\d+[.)])\s+(.*)$/.exec(trimmed);

    if (item) {
      flushParagraph();

      const ordered = /\d/.test(item[1]);

      if (!list || list.ordered !== ordered) {
        list = { type: "list", ordered, items: [] };
        blocks.push(list);
      }

      list.items.push(formatInline(item[2]));
      continue;
    }

    list = undefined;
    paragraph.push(trimmed);
  }

  flushParagraph();

  return blocks;
}

function formatInline(value: string): string {
  let text = escapeMarkup(value);

  text = text.replace(
    /\*\*(.+?)\*\*/g,
    '<span weight="600">$1</span>',
  );

  text = text.replace(
    /(^|[^*\w])\*([^*\s][^*]*?)\*/g,
    "$1<i>$2</i>",
  );

  text = text.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    `<span foreground="${LINK_COLOR}">$1</span>`,
  );

  text = text.replace(
    /(^|\s)(?:&lt;)?(https?:\/\/(?:[^\s<&]|&amp;)*[^\s<&.,;:!?)])(?:&gt;)?/g,
    `$1<span foreground="${LINK_COLOR}">$2</span>`,
  );

  text = text.replace(
    /(^|\s)(@[\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g,
    `$1<span foreground="${LINK_COLOR}">$2</span>`,
  );

  text = text.replace(
    /(^|\s)(@[\w.-]+(?:\([^)]*\))?)(?=\s|$)/g,
    `$1<span size="${pangoSize(HANDLE_SIZE)}">$2</span>`,
  );

  return text;
}
