import { Box, Button, Chip, LinearProgress, Stack, Typography } from "@mui/material";
import type { Task } from "@todoer/shared";
import { formatClock, formatMinutes } from "../lib/format";

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
  position: number;
  total: number;
  elapsedMs: number;
  onComplete: () => void;
  onAbandon: () => void;
}

export function ActiveTaskView({
  task,
  position,
  total,
  elapsedMs,
  onComplete,
  onAbandon,
}: ActiveTaskViewProps) {
  return (
    <Box sx={SCREEN}>
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Task {position} of {total}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={((position - 1) / total) * 100}
          sx={{ borderRadius: 1, height: 6 }}
        />
      </Box>

      <Box sx={CENTER}>
        {task.area && <Chip label={task.area} color="primary" variant="outlined" />}
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {task.title}
        </Typography>
        <Typography color="text.secondary">about {task.estimateMinutes} min</Typography>
        <Typography
          variant="h2"
          sx={{ fontVariantNumeric: "tabular-nums", color: "text.secondary", mt: 1 }}
        >
          {formatClock(elapsedMs)}
        </Typography>
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
  return (
    <Box sx={{ ...SCREEN, bgcolor: "primary.main", color: "primary.contrastText" }}>
      <Box sx={CENTER}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Break time
        </Typography>
        <Typography variant="h1" sx={{ fontVariantNumeric: "tabular-nums" }}>
          {formatClock(remainingMs)}
        </Typography>
        <Typography sx={{ opacity: 0.85 }}>Stretch, breathe, get some water.</Typography>
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

interface FinishViewProps {
  completed: number;
  totalElapsedMs: number;
  totalBreakMs: number;
  onDone: () => void;
}

export function FinishView({
  completed,
  totalElapsedMs,
  totalBreakMs,
  onDone,
}: FinishViewProps) {
  return (
    <Box sx={SCREEN}>
      <Box sx={{ ...CENTER, gap: 1 }}>
        <Typography variant="h3" sx={{ fontWeight: 800 }}>
          Nice work!
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {completed === 0
            ? "No tasks finished this time — that's okay."
            : `You finished ${completed} ${completed === 1 ? "task" : "tasks"}.`}
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
