import { describe, expect, it } from "vitest";
import { packingFormSchema } from "./schemas";

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
