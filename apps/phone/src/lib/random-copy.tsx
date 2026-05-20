import type { ReactNode } from "react";
import breaksText from "../copy/breaks.md?raw";
import cancelledText from "../copy/cancelled.md?raw";
import continueText from "../copy/continue.md?raw";
import finishedText from "../copy/finished.md?raw";

function toLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export const breakLines = toLines(breaksText);
export const continueLines = toLines(continueText);
export const finishedLines = toLines(finishedText);
export const cancelledLines = toLines(cancelledText);

export function pickOne<T>(items: T[]): T {
  const fallback = items[0];
  if (fallback === undefined) {
    throw new Error("pickOne: empty list");
  }
  const i = Math.floor(Math.random() * items.length);
  return items[i] ?? fallback;
}

/**
 * Tiny inline-markdown renderer: turns `**bold**` and `*italic*` into <strong>/<em>.
 * Good enough for short one-liners — does not handle nesting or other markdown.
 */
export function renderInlineMarkdown(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /\*\*([^*]+?)\*\*|\*([^*]+?)\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[1] !== undefined) {
      parts.push(<strong key={key++}>{match[1]}</strong>);
    } else if (match[2] !== undefined) {
      parts.push(<em key={key++}>{match[2]}</em>);
    }
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}
