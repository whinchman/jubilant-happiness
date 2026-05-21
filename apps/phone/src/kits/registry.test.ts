import { describe, expect, it } from "vitest";
import { findKit, kitRoute, KITS } from "./registry";

describe("KITS registry", () => {
  it("is non-empty", () => {
    expect(KITS.length).toBeGreaterThan(0);
  });

  it("has unique ids", () => {
    const ids = KITS.map((k) => k.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each entry has the required shape", () => {
    for (const k of KITS) {
      expect(typeof k.id).toBe("string");
      expect(k.id.length).toBeGreaterThan(0);
      expect(typeof k.title).toBe("string");
      expect(typeof k.blurb).toBe("string");
      expect(typeof k.icon).toBe("string");
      expect(typeof k.enabled).toBe("boolean");
    }
  });

  it("packing is enabled", () => {
    expect(findKit("packing")?.enabled).toBe(true);
  });

  it("mega-chore exists and is disabled", () => {
    expect(findKit("mega-chore")?.enabled).toBe(false);
  });
});

describe("kitRoute", () => {
  it("formats /add/kit/{id}", () => {
    expect(kitRoute("packing")).toBe("/add/kit/packing");
  });
});

describe("findKit", () => {
  it("returns undefined for missing id", () => {
    expect(findKit("unknown")).toBeUndefined();
  });

  it("returns undefined for null/empty", () => {
    expect(findKit(null)).toBeUndefined();
    expect(findKit("")).toBeUndefined();
  });
});
