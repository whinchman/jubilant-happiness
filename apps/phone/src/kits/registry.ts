export interface KitEntry {
  /** Stable id; also forms the route as `/add/kit/${id}`. */
  id: string;
  title: string;
  blurb: string;
  /** 2-char monogram shown in the picker card icon tile. */
  icon: string;
  enabled: boolean;
}

export const KITS: readonly KitEntry[] = [
  {
    id: "packing",
    title: "packing",
    blurb: "a trip → a packing list, grouped by category.",
    icon: "PK",
    enabled: true,
  },
  {
    id: "mega-chore",
    title: "mega chore",
    blurb: "one huge thing → several chores, each with steps.",
    icon: "MC",
    enabled: true,
  },
];

export function kitRoute(id: string): string {
  return `/add/kit/${id}`;
}

export function findKit(id: string | undefined | null): KitEntry | undefined {
  if (!id) return undefined;
  return KITS.find((k) => k.id === id);
}
