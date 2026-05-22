import { describe, expect, it } from "vitest";
import {
  MEGA_CHORE_SYSTEM_PROMPT,
  MEGA_CHORE_FORCE_FINALIZE_SUFFIX,
  buildMegaChoreSystemPrompt,
  parseMegaChoreToolResponse,
} from "./mega-chore";

describe("buildMegaChoreSystemPrompt", () => {
  it("returns the base prompt when forceFinalize is false", () => {
    const p = buildMegaChoreSystemPrompt(false);
    expect(p).toContain("turning ONE huge thing");
    expect(p).not.toContain(MEGA_CHORE_FORCE_FINALIZE_SUFFIX);
  });

  it("appends the force-finalize suffix when forceFinalize is true", () => {
    const p = buildMegaChoreSystemPrompt(true);
    expect(p.startsWith(MEGA_CHORE_SYSTEM_PROMPT)).toBe(true);
    expect(p).toContain(MEGA_CHORE_FORCE_FINALIZE_SUFFIX);
  });
});

describe("parseMegaChoreToolResponse", () => {
  it("parses a question response", () => {
    const out = parseMegaChoreToolResponse({
      kind: "question",
      text: "How big is the garage?",
    });
    expect(out).toEqual({
      kind: "question",
      assistantMessage: "How big is the garage?",
    });
  });

  it("parses a breakdown response", () => {
    const out = parseMegaChoreToolResponse({
      kind: "breakdown",
      megaChore: { title: "Clean the garage" },
      area: "Garage",
      chores: [
        {
          title: "clear the floor",
          estimateMinutes: 60,
          group: 1,
          steps: [{ title: "scan", estimateMinutes: 5 }],
        },
        {
          title: "sort the shelves",
          estimateMinutes: 90,
          group: 2,
          steps: [{ title: "pull", estimateMinutes: 10 }],
        },
      ],
    });
    expect(out.kind).toBe("breakdown");
    if (out.kind === "breakdown") {
      expect(out.preview.megaChore.title).toBe("Clean the garage");
      expect(out.preview.chores).toHaveLength(2);
    }
  });

  it("throws on an unknown kind", () => {
    expect(() =>
      parseMegaChoreToolResponse({ kind: "foo" } as unknown),
    ).toThrow();
  });

  it("throws on a breakdown with a group gap", () => {
    expect(() =>
      parseMegaChoreToolResponse({
        kind: "breakdown",
        megaChore: { title: "x" },
        area: "x",
        chores: [
          {
            title: "a",
            estimateMinutes: 10,
            group: 1,
            steps: [{ title: "s", estimateMinutes: 5 }],
          },
          {
            title: "b",
            estimateMinutes: 10,
            group: 3,
            steps: [{ title: "s", estimateMinutes: 5 }],
          },
        ],
      }),
    ).toThrow();
  });

  it("throws on a single-chore breakdown", () => {
    expect(() =>
      parseMegaChoreToolResponse({
        kind: "breakdown",
        megaChore: { title: "x" },
        area: "x",
        chores: [
          {
            title: "a",
            estimateMinutes: 10,
            group: 1,
            steps: [{ title: "s", estimateMinutes: 5 }],
          },
        ],
      }),
    ).toThrow();
  });
});
