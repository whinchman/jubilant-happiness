import { useState } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import type { FocusItem } from "@todoer/shared";
import { formatClock, formatMinutes } from "../lib/format";
import {
  breakLines,
  cancelledLines,
  continueLines,
  finishedLines,
  pickOne,
  renderInlineMarkdown,
} from "../lib/random-copy";
import { Sticker } from "./Chrome";
import {
  bg,
  bgCard,
  blue,
  display,
  hairline,
  ink,
  inkDim,
  mono,
  pink,
  red,
  yellow,
} from "../theme";

const SCREEN = {
  minHeight: "100dvh",
  display: "flex",
  flexDirection: "column",
  px: 3,
  py: 3,
} as const;

interface ActiveTaskViewProps {
  item: FocusItem;
  elapsedMs: number;
  onComplete: () => void;
  onAbandon: () => void;
}

export function ActiveTaskView({
  item,
  elapsedMs,
  onComplete,
  onAbandon,
}: ActiveTaskViewProps) {
  const view = describe(item);
  const estimateMs = view.estimateMinutes * 60_000;
  const progress = Math.max(0, 1 - elapsedMs / estimateMs);
  const overtime = elapsedMs >= estimateMs;

  return (
    <Box sx={SCREEN}>
      {/* Top: overline + abandon link */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <Sticker color={item.kind === "step" ? "blue" : "pink"} rotate={-2} size="sm">
          {view.overline}
        </Sticker>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="text"
          onClick={onAbandon}
          sx={{
            fontFamily: mono,
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: inkDim,
            p: 0,
            minWidth: 0,
          }}
        >
          ✕ abandon
        </Button>
      </Box>

      {/* Middle: task content */}
      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 2,
        }}
      >
        {view.area && (
          <Box>
            <Sticker color="yellow" rotate={1.5} size="sm">
              {view.area}
            </Sticker>
          </Box>
        )}

        {view.context && (
          <Typography
            sx={{
              fontFamily: mono,
              fontWeight: 500,
              fontSize: 12,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: inkDim,
            }}
          >
            from: {view.context}
          </Typography>
        )}

        <Typography
          sx={{
            fontFamily: display,
            fontWeight: 900,
            fontSize: { xs: 56, sm: 72 },
            lineHeight: 0.95,
            textTransform: "uppercase",
            letterSpacing: "-0.01em",
            color: ink,
            textShadow: overtime
              ? "none"
              : `2px 2px 0 ${pink}, -2px -2px 0 ${blue}`,
          }}
        >
          {view.title}
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography
            sx={{
              fontFamily: display,
              fontWeight: 700,
              fontSize: 36,
              lineHeight: 1,
              color: ink,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            ~{view.estimateMinutes}
          </Typography>
          <Typography
            sx={{
              fontFamily: mono,
              fontSize: 12,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: inkDim,
              alignSelf: "flex-end",
              pb: 1,
            }}
          >
            minutes
          </Typography>
        </Box>

        {overtime ? <OvertimeStamp /> : <ProgressBar progress={progress} />}
      </Box>

      {/* Bottom: big complete CTA */}
      <Stack spacing={1.5} sx={{ mt: 3 }}>
        <Button
          variant="contained"
          size="large"
          onClick={onComplete}
          sx={{
            py: 2.5,
            fontSize: 22,
            justifyContent: "space-between",
          }}
        >
          <Box component="span">Complete</Box>
          <Box
            component="span"
            sx={{
              fontFamily: display,
              fontWeight: 900,
              fontSize: 28,
              color: yellow,
            }}
          >
            ✓
          </Box>
        </Button>
      </Stack>
    </Box>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <Box sx={{ width: "100%", mt: 2 }}>
      <Box
        sx={{
          width: "100%",
          height: 26,
          border: `2px solid ${ink}`,
          bgcolor: bgCard,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            width: `${progress * 100}%`,
            height: "100%",
            bgcolor: pink,
            transition: "width 1s linear",
          }}
        />
        {/* Tick overlay every 10% */}
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            backgroundImage: `repeating-linear-gradient(to right, transparent 0, transparent calc(10% - 1.5px), ${ink} calc(10% - 1.5px), ${ink} 10%)`,
            opacity: 0.55,
          }}
        />
      </Box>
      <Box
        sx={{
          mt: 0.75,
          display: "flex",
          justifyContent: "space-between",
          fontFamily: mono,
          fontSize: 10,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: inkDim,
        }}
      >
        <span>now</span>
        <span>time left</span>
        <span>done</span>
      </Box>
    </Box>
  );
}

function OvertimeStamp() {
  return (
    <Box
      sx={{
        position: "relative",
        my: 3,
        py: 3,
        px: 2,
        transform: "rotate(-3deg)",
        bgcolor: red,
        color: bg,
        border: `4px solid ${ink}`,
        boxShadow: `8px 8px 0 0 ${ink}`,
        textAlign: "center",
        overflow: "hidden",
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          backgroundImage: `repeating-linear-gradient(-45deg, transparent 0, transparent 14px, rgba(0,0,0,0.18) 14px, rgba(0,0,0,0.18) 22px)`,
        }}
      />
      <Typography
        sx={{
          position: "relative",
          fontFamily: display,
          fontWeight: 900,
          fontSize: { xs: 64, sm: 84 },
          lineHeight: 1,
          letterSpacing: "0.02em",
          textTransform: "uppercase",
          textShadow: `3px 3px 0 ${ink}`,
        }}
      >
        OVERTIME!
      </Typography>
      <Typography
        sx={{
          position: "relative",
          mt: 1,
          fontFamily: mono,
          fontWeight: 500,
          fontSize: 12,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
        }}
      >
        keep going · finish strong
      </Typography>
    </Box>
  );
}

interface ActiveTaskDescriptor {
  overline: string;
  title: string;
  context: string | null;
  area: string | null;
  estimateMinutes: number;
}

function describe(item: FocusItem): ActiveTaskDescriptor {
  if (item.kind === "standalone") {
    return {
      overline: "current chore",
      title: item.chore.title,
      context: null,
      area: item.chore.area,
      estimateMinutes: item.chore.estimateMinutes,
    };
  }
  // No "X of N" — see [[focus-no-remaining-work]] in memory.
  return {
    overline: "current step",
    title: item.step.title,
    context: item.chore.title,
    area: item.chore.area,
    estimateMinutes: item.step.estimateMinutes,
  };
}

interface BreakViewProps {
  remainingMs: number;
  onResume: () => void;
  onAbandon: () => void;
}

export function BreakView({ remainingMs, onResume, onAbandon }: BreakViewProps) {
  const [line] = useState(() => pickOne(breakLines));

  return (
    <Box
      sx={{
        ...SCREEN,
        bgcolor: pink,
        color: ink,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <Sticker color="ink" rotate={-2} size="sm">
          break_time
        </Sticker>
        <Box sx={{ flexGrow: 1 }} />
      </Box>

      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "stretch",
          gap: 1,
          textAlign: "center",
        }}
      >
        <Typography
          sx={{
            fontFamily: display,
            fontWeight: 800,
            fontSize: 28,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
          }}
        >
          take a breather.
        </Typography>
        <Typography
          sx={{
            fontFamily: display,
            fontWeight: 900,
            fontSize: { xs: 140, sm: 180 },
            lineHeight: 1,
            color: ink,
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "-0.04em",
            textShadow: `4px 4px 0 ${bg}`,
            my: 1,
          }}
        >
          {formatClock(remainingMs)}
        </Typography>
        <Typography
          sx={{
            fontFamily: mono,
            fontSize: 13,
            lineHeight: 1.5,
            px: 2,
            mt: 1,
            color: ink,
          }}
        >
          {renderInlineMarkdown(line)}
        </Typography>
      </Box>

      <Stack spacing={1.5}>
        <Button
          variant="contained"
          size="large"
          onClick={onResume}
          sx={{
            py: 2.5,
            fontSize: 20,
            bgcolor: ink,
            color: bg,
            border: `2px solid ${ink}`,
            boxShadow: `4px 4px 0 0 ${yellow}`,
            "&:hover": {
              bgcolor: ink,
              boxShadow: `6px 6px 0 0 ${yellow}`,
            },
          }}
        >
          start next →
        </Button>
        <Button
          variant="text"
          onClick={onAbandon}
          sx={{
            fontFamily: mono,
            color: ink,
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            textDecorationThickness: 2,
          }}
        >
          end session
        </Button>
      </Stack>
    </Box>
  );
}

interface AreaCompleteViewProps {
  completed: number;
  onContinue: () => void;
  onFinish: () => void;
  continuing?: boolean;
}

export function AreaCompleteView({
  completed,
  onContinue,
  onFinish,
  continuing = false,
}: AreaCompleteViewProps) {
  const [line] = useState(() => pickOne(continueLines));

  return (
    <Box sx={SCREEN}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <Sticker color="yellow" rotate={-3}>
          area cleared!
        </Sticker>
        <Box sx={{ flexGrow: 1 }} />
        <Sticker color="blue" rotate={2} size="sm">
          {String(completed).padStart(2, "0")} done
        </Sticker>
      </Box>

      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 2,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontFamily: display,
              fontWeight: 900,
              fontSize: { xs: 64, sm: 84 },
              lineHeight: 0.9,
              textTransform: "uppercase",
              letterSpacing: "-0.01em",
              textShadow: `3px 3px 0 ${pink}, -3px -3px 0 ${blue}`,
            }}
          >
            on a
            <br />
            <Box component="span" sx={{ color: pink }}>
              roll!
            </Box>
          </Typography>
        </Box>
        <Typography
          sx={{
            fontFamily: mono,
            fontSize: 14,
            lineHeight: 1.5,
            color: ink,
            maxWidth: 480,
          }}
        >
          {renderInlineMarkdown(line)}
        </Typography>
        <Typography
          sx={{
            fontFamily: mono,
            fontSize: 12,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: inkDim,
            mt: 1,
          }}
        >
          keep going with the next area, or wrap?
        </Typography>
      </Box>

      <Stack spacing={1.5}>
        <Button
          variant="contained"
          size="large"
          onClick={onContinue}
          disabled={continuing}
          sx={{
            py: 2.5,
            fontSize: 22,
            justifyContent: "space-between",
          }}
        >
          <Box component="span">{continuing ? "loading…" : "continue"}</Box>
          {!continuing && (
            <Box
              component="span"
              sx={{
                fontFamily: display,
                fontWeight: 900,
                fontSize: 28,
                color: yellow,
              }}
            >
              →
            </Box>
          )}
        </Button>
        <Button
          variant="outlined"
          size="large"
          onClick={onFinish}
          disabled={continuing}
          sx={{ py: 2, fontSize: 18 }}
        >
          finish session
        </Button>
      </Stack>
    </Box>
  );
}

interface FinishViewProps {
  completed: number;
  totalElapsedMs: number;
  totalBreakMs: number;
  cancelled: boolean;
  onDone: () => void;
}

export function FinishView({
  completed,
  totalElapsedMs,
  totalBreakMs,
  cancelled,
  onDone,
}: FinishViewProps) {
  const [line] = useState(() =>
    pickOne(cancelled ? cancelledLines : finishedLines),
  );

  return (
    <Box sx={SCREEN}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <Sticker color={cancelled ? "pink" : "yellow"} rotate={-3}>
          {cancelled ? "session ended" : "session complete!"}
        </Sticker>
      </Box>

      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 3,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontFamily: display,
              fontWeight: 900,
              fontSize: { xs: 72, sm: 96 },
              lineHeight: 0.9,
              textTransform: "uppercase",
              letterSpacing: "-0.01em",
              textShadow: `3px 3px 0 ${pink}, -3px -3px 0 ${blue}`,
            }}
          >
            {cancelled ? "thats" : "nice"}
            <br />
            <Box component="span" sx={{ color: cancelled ? blue : pink }}>
              {cancelled ? "okay." : "work!"}
            </Box>
          </Typography>
        </Box>

        <Typography
          sx={{
            fontFamily: mono,
            fontSize: 14,
            lineHeight: 1.5,
            color: ink,
          }}
        >
          {renderInlineMarkdown(line)}
        </Typography>

        <Box
          sx={{
            border: `2px solid ${ink}`,
            bgcolor: bgCard,
            p: 1.5,
            mt: 1,
          }}
        >
          <StatRow label="tasks completed" value={String(completed)} />
          <Divider />
          <StatRow label="total time" value={formatMinutes(totalElapsedMs)} />
          <Divider />
          <StatRow label="break time" value={formatMinutes(totalBreakMs)} />
        </Box>
      </Box>

      <Stack spacing={1.5} sx={{ mt: 3 }}>
        <Button
          variant="contained"
          size="large"
          onClick={onDone}
          sx={{ py: 2.5, fontSize: 22, justifyContent: "center" }}
        >
          done
        </Button>
      </Stack>
    </Box>
  );
}

function Divider() {
  return (
    <Box
      sx={{
        borderTop: `1.5px dashed ${hairline}`,
        my: 0.25,
      }}
    />
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        py: 0.75,
        px: 0.5,
      }}
    >
      <Typography
        sx={{
          fontFamily: mono,
          fontSize: 12,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: inkDim,
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontFamily: display,
          fontWeight: 800,
          fontSize: 28,
          color: ink,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}
