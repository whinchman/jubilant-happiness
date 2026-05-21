import { describe, expect, it } from "vitest";
import type { PackingFormInput } from "@todoer/shared";
import {
  buildPackingArea,
  buildPackingProjectTitle,
  buildPackingUserMessage,
} from "./packing";

const base: PackingFormInput = {
  destination: "Portland",
  nights: 3,
  tripType: "leisure",
  climate: "mild",
  adults: 1,
  children: 0,
  dogs: 0,
};

describe("buildPackingUserMessage", () => {
  it("renders a multi-line block with all fields", () => {
    const msg = buildPackingUserMessage(base);
    expect(msg).toContain("destination: Portland");
    expect(msg).toContain("nights: 3");
    expect(msg).toContain("trip type: leisure");
    expect(msg).toContain("climate: mild");
    expect(msg).toContain("travelers: 1 adult(s), 0 child(ren), 0 dog(s)");
    expect(msg).toContain("anything else: —");
  });

  it("appends the day-trip note when nights is 0", () => {
    const msg = buildPackingUserMessage({ ...base, nights: 0 });
    expect(msg).toContain("nights: 0");
    expect(msg).toContain("day trip — pack lighter");
  });

  it("does NOT append the day-trip note for nights >= 1", () => {
    const msg = buildPackingUserMessage(base);
    expect(msg).not.toContain("day trip");
  });

  it("uses '—' when anythingElse is empty/missing", () => {
    expect(buildPackingUserMessage(base)).toContain("anything else: —");
    expect(
      buildPackingUserMessage({ ...base, anythingElse: "   " }),
    ).toContain("anything else: —");
  });

  it("includes anythingElse verbatim when present", () => {
    const msg = buildPackingUserMessage({
      ...base,
      anythingElse: "presenting on day 3",
    });
    expect(msg).toContain("anything else: presenting on day 3");
  });

  it("renders kids and dogs in the travelers line", () => {
    const msg = buildPackingUserMessage({
      ...base,
      adults: 2,
      children: 2,
      dogs: 1,
    });
    expect(msg).toContain("travelers: 2 adult(s), 2 child(ren), 1 dog(s)");
  });
});

describe("buildPackingProjectTitle", () => {
  it("uses '· {n}n' for multi-night trips", () => {
    expect(buildPackingProjectTitle(base)).toBe("Pack for Portland · 3n");
  });

  it("uses '· day trip' for nights = 0", () => {
    expect(buildPackingProjectTitle({ ...base, nights: 0 })).toBe(
      "Pack for Portland · day trip",
    );
  });
});

describe("buildPackingArea", () => {
  it("returns '{destination} - Trip'", () => {
    expect(buildPackingArea(base)).toBe("Portland - Trip");
    expect(buildPackingArea({ ...base, destination: "Cabin" })).toBe("Cabin - Trip");
  });
});
