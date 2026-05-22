import { describe, expect, it } from "vitest";
import {
  packingFormSchema,
  chatMessageSchema,
  megaChoreTurnRequestSchema,
  megaChoreBreakdownPreviewSchema,
  acceptMegaChoreBreakdownSchema,
} from "./schemas";

const valid = {
  destination: "Portland",
  nights: 3,
  tripType: "leisure" as const,
  climate: "mild" as const,
  adults: 1,
  children: 0,
  dogs: 0,
};

describe("packingFormSchema", () => {
  it("accepts a minimal valid form", () => {
    expect(packingFormSchema.parse(valid).destination).toBe("Portland");
  });

  it("accepts a day trip (nights = 0)", () => {
    expect(packingFormSchema.parse({ ...valid, nights: 0 }).nights).toBe(0);
  });

  it("trims destination", () => {
    expect(
      packingFormSchema.parse({ ...valid, destination: "  Paris  " }).destination,
    ).toBe("Paris");
  });

  it("rejects empty destination", () => {
    expect(() => packingFormSchema.parse({ ...valid, destination: "   " })).toThrow();
  });

  it("rejects nights = -1", () => {
    expect(() => packingFormSchema.parse({ ...valid, nights: -1 })).toThrow();
  });

  it("rejects nights = 61", () => {
    expect(() => packingFormSchema.parse({ ...valid, nights: 61 })).toThrow();
  });

  it("rejects adults = 0", () => {
    expect(() => packingFormSchema.parse({ ...valid, adults: 0 })).toThrow();
  });

  it("rejects unknown trip type", () => {
    expect(() =>
      packingFormSchema.parse({ ...valid, tripType: "spaceflight" as never }),
    ).toThrow();
  });

  it("rejects unknown climate", () => {
    expect(() =>
      packingFormSchema.parse({ ...valid, climate: "humid" as never }),
    ).toThrow();
  });

  it("rejects anythingElse over 500 chars", () => {
    expect(() =>
      packingFormSchema.parse({ ...valid, anythingElse: "x".repeat(501) }),
    ).toThrow();
  });

  it("accepts anythingElse exactly 500 chars", () => {
    expect(
      packingFormSchema.parse({ ...valid, anythingElse: "x".repeat(500) }).anythingElse,
    ).toHaveLength(500);
  });
});

describe("chatMessageSchema", () => {
  it("accepts a user message", () => {
    expect(
      chatMessageSchema.safeParse({ role: "user", content: "hello" }).success,
    ).toBe(true);
  });
  it("rejects an unknown role", () => {
    expect(
      chatMessageSchema.safeParse({ role: "system", content: "x" }).success,
    ).toBe(false);
  });
  it("rejects empty content", () => {
    expect(
      chatMessageSchema.safeParse({ role: "user", content: "" }).success,
    ).toBe(false);
  });
});

describe("megaChoreTurnRequestSchema", () => {
  it("accepts a single user message", () => {
    expect(
      megaChoreTurnRequestSchema.safeParse({
        messages: [{ role: "user", content: "clean the garage" }],
      }).success,
    ).toBe(true);
  });
  it("accepts forceFinalize: true", () => {
    expect(
      megaChoreTurnRequestSchema.safeParse({
        messages: [{ role: "user", content: "x" }],
        forceFinalize: true,
      }).success,
    ).toBe(true);
  });
  it("rejects empty messages array", () => {
    expect(
      megaChoreTurnRequestSchema.safeParse({ messages: [] }).success,
    ).toBe(false);
  });
});

const validPreview = {
  megaChore: { title: "Clean the garage" },
  area: "Garage",
  chores: [
    {
      title: "clear the floor",
      estimateMinutes: 60,
      group: 1,
      steps: [{ title: "scan floor", estimateMinutes: 5 }],
    },
    {
      title: "sort the shelves",
      estimateMinutes: 90,
      group: 2,
      steps: [{ title: "pull boxes", estimateMinutes: 10 }],
    },
  ],
};

describe("megaChoreBreakdownPreviewSchema", () => {
  it("accepts a 2-chore preview with consecutive groups", () => {
    expect(megaChoreBreakdownPreviewSchema.safeParse(validPreview).success).toBe(
      true,
    );
  });
  it("rejects fewer than 2 chores", () => {
    expect(
      megaChoreBreakdownPreviewSchema.safeParse({
        ...validPreview,
        chores: validPreview.chores.slice(0, 1),
      }).success,
    ).toBe(false);
  });
  it("rejects more than 10 chores", () => {
    const many = Array.from({ length: 11 }, (_, i) => ({
      title: `c${i}`,
      estimateMinutes: 10,
      group: i + 1,
      steps: [{ title: "s", estimateMinutes: 5 }],
    }));
    expect(
      megaChoreBreakdownPreviewSchema.safeParse({
        ...validPreview,
        chores: many,
      }).success,
    ).toBe(false);
  });
  it("rejects a chore with zero steps", () => {
    expect(
      megaChoreBreakdownPreviewSchema.safeParse({
        ...validPreview,
        chores: [
          { ...validPreview.chores[0], steps: [] },
          validPreview.chores[1],
        ],
      }).success,
    ).toBe(false);
  });
  it("rejects a chore with more than 30 steps", () => {
    const steps = Array.from({ length: 31 }, (_, i) => ({
      title: `s${i}`,
      estimateMinutes: 5,
    }));
    expect(
      megaChoreBreakdownPreviewSchema.safeParse({
        ...validPreview,
        chores: [{ ...validPreview.chores[0], steps }, validPreview.chores[1]],
      }).success,
    ).toBe(false);
  });
  it("rejects a gap in group sequence (1,3)", () => {
    expect(
      megaChoreBreakdownPreviewSchema.safeParse({
        ...validPreview,
        chores: [
          { ...validPreview.chores[0], group: 1 },
          { ...validPreview.chores[1], group: 3 },
        ],
      }).success,
    ).toBe(false);
  });
  it("accepts parallel chores sharing a group (1,1,2)", () => {
    expect(
      megaChoreBreakdownPreviewSchema.safeParse({
        ...validPreview,
        chores: [
          { ...validPreview.chores[0], group: 1 },
          { ...validPreview.chores[0], title: "b", group: 1 },
          { ...validPreview.chores[1], group: 2 },
        ],
      }).success,
    ).toBe(true);
  });
  it("rejects empty mega-chore title", () => {
    expect(
      megaChoreBreakdownPreviewSchema.safeParse({
        ...validPreview,
        megaChore: { title: "   " },
      }).success,
    ).toBe(false);
  });
});

describe("acceptMegaChoreBreakdownSchema", () => {
  it("accepts a valid preview", () => {
    expect(acceptMegaChoreBreakdownSchema.safeParse(validPreview).success).toBe(
      true,
    );
  });
});
