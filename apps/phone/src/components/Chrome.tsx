import type { ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import {
  bg,
  bgCard,
  blue,
  display,
  hairline,
  ink,
  inkFaint,
  mono,
  pink,
  yellow,
} from "../theme";

/**
 * A hand-stuck risograph sticker — small caps chip, thick black border, rotated.
 * Use for badges, version numbers, "no. 140" markers, etc.
 */
export function Sticker({
  children,
  color = "pink",
  rotate = -2,
  size = "md",
}: {
  children: ReactNode;
  color?: "pink" | "blue" | "yellow" | "ink" | "card";
  rotate?: number;
  size?: "sm" | "md";
}) {
  const palette = {
    pink: { bg: pink, fg: ink },
    blue: { bg: blue, fg: bg },
    yellow: { bg: yellow, fg: ink },
    ink: { bg: ink, fg: bg },
    card: { bg: bgCard, fg: ink },
  }[color];
  return (
    <Box
      component="span"
      sx={{
        display: "inline-block",
        bgcolor: palette.bg,
        color: palette.fg,
        border: `2px solid ${ink}`,
        px: size === "sm" ? 0.75 : 1.25,
        py: size === "sm" ? 0.2 : 0.4,
        fontFamily: mono,
        fontWeight: 500,
        fontSize: size === "sm" ? 10 : 11,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        transform: `rotate(${rotate}deg)`,
        whiteSpace: "nowrap",
        boxShadow: `2px 2px 0 0 ${ink}`,
      }}
    >
      {children}
    </Box>
  );
}

/**
 * The big display headline word with subtle riso misregistration —
 * pink offset +2/+2, blue offset -2/-2 behind the ink layer.
 */
export function OffsetHeadline({
  children,
  size = 88,
  color = ink,
  italic = false,
}: {
  children: ReactNode;
  size?: number;
  color?: string;
  italic?: boolean;
}) {
  return (
    <Box
      component="span"
      sx={{
        fontFamily: display,
        fontWeight: 900,
        fontSize: size,
        lineHeight: 0.85,
        letterSpacing: "-0.01em",
        textTransform: "uppercase",
        color,
        fontStyle: italic ? "italic" : "normal",
        textShadow: `2px 2px 0 ${pink}, -2px -2px 0 ${blue}`,
        display: "inline-block",
      }}
    >
      {children}
    </Box>
  );
}

/** A thick dashed/ticked rule used as a section divider. */
export function TornRule({ color = ink, mt = 0, mb = 0 }: { color?: string; mt?: number; mb?: number }) {
  return (
    <Box
      sx={{
        mt,
        mb,
        height: 0,
        borderTop: `2px dashed ${color}`,
      }}
    />
  );
}

/** Footer "★ TAG ★ DATE ★" stamp line. */
export function StampFooter({
  left,
  right,
}: {
  left?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        px: 2.5,
        py: 1.25,
        borderTop: `2px solid ${ink}`,
        bgcolor: ink,
        color: bg,
        fontFamily: mono,
        fontSize: 10.5,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
      }}
    >
      {left && (
        <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box component="span" sx={{ color: yellow }}>★</Box>
          {left}
        </Box>
      )}
      <Box sx={{ flexGrow: 1 }} />
      {right && (
        <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {right}
          <Box component="span" sx={{ color: pink }}>★</Box>
        </Box>
      )}
    </Box>
  );
}

/** Compact day-of-year label, e.g. "no. 140". */
export function dayOfYearLabel(d: Date = new Date()): string {
  const start = new Date(d.getFullYear(), 0, 0);
  const diffMs = d.getTime() - start.getTime();
  const day = Math.floor(diffMs / 86_400_000);
  return `no.${String(day).padStart(3, "0")}`;
}

/** DD·MM·YY stamp for footers. */
export function isoStamp(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}·${pad(d.getMonth() + 1)}·${String(d.getFullYear()).slice(-2)}`;
}

/** Inline "→ label" menu marker as used on Home and other action lists. */
export function Arrow({ children }: { children?: ReactNode }) {
  return (
    <Box
      component="span"
      sx={{
        fontFamily: display,
        fontWeight: 900,
        color: pink,
        mr: 1.25,
      }}
    >
      →{children}
    </Box>
  );
}

/** Section title — pink overline + ticked rule. Used inside content. */
export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography
        variant="overline"
        sx={{
          display: "inline-block",
          color: pink,
          letterSpacing: "0.22em",
          fontWeight: 600,
          mr: 1,
        }}
      >
        ▍ {children}
      </Typography>
      <Box
        sx={{
          mt: 0.5,
          height: 0,
          borderTop: `2px solid ${ink}`,
        }}
      />
    </Box>
  );
}

// Re-export raw tokens so callers don't all need to depend on theme.ts.
export { ink, bg, hairline, inkFaint };
