import { useState } from "react";
import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import type { Task } from "@todoer/shared";
import { formatClock, formatMinutes } from "../lib/format";
import {
  breakLines,
  cancelledLines,
  continueLines,
  finishedLines,
  pickOne,
  renderInlineMarkdown,
} from "../lib/random-copy";

const SCREEN = {
  height: "100dvh",
  display: "flex",
  flexDirection: "column",
  p: 3,
} as const;

const CENTER = {
  flexGrow: 1,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  textAlign: "center",
  gap: 2,
} as const;

interface ActiveTaskViewProps {
  task: Task;
  elapsedMs: number;
  onComplete: () => void;
  onAbandon: () => void;
}

export function ActiveTaskView({
  task,
  elapsedMs,
  onComplete,
  onAbandon,
}: ActiveTaskViewProps) {
  const estimateMs = task.estimateMinutes * 60_000;
  const progress = Math.max(0, 1 - elapsedMs / estimateMs);
  const overtime = elapsedMs >= estimateMs;
  // 100–80% pure green; 80–40% green→yellow; 40–0% yellow→red.
  const hue = Math.min(120, 150 * progress);
  const barColor = `hsl(${hue}, 75%, 47%)`;

  return (
    <Box sx={SCREEN}>
      <Box sx={{ textAlign: "center" }}>
        <Typography
          variant="overline"
          sx={{ color: "text.secondary", fontWeight: 600 }}
        >
          Current Task
        </Typography>
        <Box
          sx={{
            height: 4,
            width: 56,
            mx: "auto",
            mt: 0.5,
            bgcolor: "primary.main",
            borderRadius: 999,
          }}
        />
      </Box>

      <Box sx={CENTER}>
        {task.area && <Chip label={task.area} color="primary" variant="outlined" />}
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {task.title}
        </Typography>
        <Typography color="text.secondary">about {task.estimateMinutes} min</Typography>

        {overtime ? (
          <Typography
            variant="h2"
            sx={{
              fontWeight: 900,
              color: "error.main",
              mt: 2,
              letterSpacing: 1,
            }}
          >
            OVERTIME!
          </Typography>
        ) : (
          <Box sx={{ width: "100%", maxWidth: 420, mt: 2 }}>
            <Box
              sx={{
                width: "100%",
                height: 18,
                bgcolor: "rgba(0,0,0,0.08)",
                borderRadius: 999,
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  width: `${progress * 100}%`,
                  height: "100%",
                  bgcolor: barColor,
                  transition: "width 1s linear, background-color 1s linear",
                }}
              />
            </Box>
          </Box>
        )}
      </Box>

      <Stack spacing={1}>
        <Button
          variant="contained"
          size="large"
          onClick={onComplete}
          sx={{ py: 1.8, fontSize: 18 }}
        >
          Complete
        </Button>
        <Button onClick={onAbandon} sx={{ color: "text.secondary" }}>
          Abandon session
        </Button>
      </Stack>
    </Box>
  );
}

interface BreakViewProps {
  remainingMs: number;
  onResume: () => void;
  onAbandon: () => void;
}

export function BreakView({ remainingMs, onResume, onAbandon }: BreakViewProps) {
  const [line] = useState(() => pickOne(breakLines));

  return (
    <Box sx={{ ...SCREEN, bgcolor: "primary.main", color: "primary.contrastText" }}>
      <Box sx={CENTER}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Break time
        </Typography>
        <Typography variant="h1" sx={{ fontVariantNumeric: "tabular-nums" }}>
          {formatClock(remainingMs)}
        </Typography>
        <Typography sx={{ opacity: 0.85, px: 2 }}>
          {renderInlineMarkdown(line)}
        </Typography>
      </Box>
      <Stack spacing={1}>
        <Button
          variant="contained"
          color="inherit"
          size="large"
          onClick={onResume}
          sx={{ py: 1.8, fontSize: 18, color: "primary.main" }}
        >
          Start next task
        </Button>
        <Button onClick={onAbandon} sx={{ color: "primary.contrastText", opacity: 0.85 }}>
          End session
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
  completed: _completed,
  onContinue,
  onFinish,
  continuing = false,
}: AreaCompleteViewProps) {
  const [line] = useState(() => pickOne(continueLines));

  return (
    <Box sx={SCREEN}>
      <Box sx={{ ...CENTER, gap: 1.5 }}>
        <Typography variant="h3" sx={{ fontWeight: 800 }}>
          On a roll!
        </Typography>
        <Typography color="text.secondary" sx={{ px: 2 }}>
          {renderInlineMarkdown(line)}
        </Typography>
        <Typography sx={{ mt: 2, fontWeight: 500 }}>
          Keep going with the next area, or wrap it up?
        </Typography>
      </Box>
      <Stack spacing={1}>
        <Button
          variant="contained"
          size="large"
          onClick={onContinue}
          disabled={continuing}
          sx={{ py: 1.8, fontSize: 18 }}
        >
          {continuing ? "Loading next area…" : "Continue"}
        </Button>
        <Button
          onClick={onFinish}
          disabled={continuing}
          sx={{ color: "text.secondary" }}
        >
          Finish
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
      <Box sx={{ ...CENTER, gap: 1 }}>
        <Typography variant="h3" sx={{ fontWeight: 800 }}>
          Nice work!
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2, px: 2 }}>
          {renderInlineMarkdown(line)}
        </Typography>
        <StatRow label="Tasks completed" value={String(completed)} />
        <StatRow label="Total time" value={formatMinutes(totalElapsedMs)} />
        <StatRow label="Break time" value={formatMinutes(totalBreakMs)} />
      </Box>
      <Button
        variant="contained"
        size="large"
        onClick={onDone}
        sx={{ py: 1.8, fontSize: 18 }}
      >
        Done
      </Button>
    </Box>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        width: "100%",
        maxWidth: 280,
        py: 0.5,
      }}
    >
      <Typography color="text.secondary">{label}</Typography>
      <Typography sx={{ fontWeight: 700 }}>{value}</Typography>
    </Box>
  );
}
