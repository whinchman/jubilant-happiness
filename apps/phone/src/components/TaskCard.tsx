import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import RepeatIcon from "@mui/icons-material/Repeat";
import { Box, Card, CardContent, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router";
import type { ChoreWithSteps, Lane, Task } from "@todoer/shared";
import {
  bg,
  bgCard,
  blue,
  blueSoft,
  display,
  ink,
  inkDim,
  inkFaint,
  mono,
  pink,
  yellow,
} from "../theme";
import { useUpdateStep } from "../lib/api-hooks";
import { expandChoreToFocusItems, hasFocusableWork } from "../lib/focus-items";

interface TaskCardProps {
  chore: ChoreWithSteps;
  onClick?: () => void;
  /** Suppress rotation when used inside a DragOverlay. */
  flat?: boolean;
  lane?: Lane;
}

/** Deterministic -1.5° to +1.5° based on chore id — cards feel hand-stuck. */
function stableTilt(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return (((h % 30) + 30) % 30) / 10 - 1.5;
}

export function TaskCard({ chore, onClick, flat = false, lane }: TaskCardProps) {
  const navigate = useNavigate();
  const steps = chore.steps;
  const currentStep = steps.find((s) => s.completedAt === null) ?? null;
  const estimateLabel = formatEstimate(chore);
  const tilt = flat ? 0 : stableTilt(chore.id);
  const isDone = lane === "done";
  const showStart = !flat && !isDone && hasFocusableWork(chore);

  function handleStart(e: React.MouseEvent) {
    e.stopPropagation();
    navigate("/focus", { state: { session: expandChoreToFocusItems(chore) } });
  }

  return (
    <Card
      onClick={onClick}
      sx={{
        borderRadius: 0,
        borderWidth: 2,
        borderColor: ink,
        bgcolor: isDone ? bg : bgCard,
        transform: `rotate(${tilt}deg)`,
        boxShadow: flat ? `6px 6px 0 0 ${pink}` : `3px 3px 0 0 ${ink}`,
        transition: "transform 120ms ease, box-shadow 120ms ease",
        cursor: onClick ? "pointer" : "inherit",
        position: "relative",
        opacity: isDone ? 0.7 : 1,
        "&:hover": {
          transform: `rotate(${tilt}deg) translate(-2px, -2px)`,
          boxShadow: `5px 5px 0 0 ${pink}`,
        },
      }}
    >
      {showStart && (
        <Box
          component="button"
          onClick={handleStart}
          aria-label={`Start focus on "${chore.title}"`}
          sx={{
            all: "unset",
            cursor: "pointer",
            position: "absolute",
            top: 8,
            right: 8,
            zIndex: 1,
            bgcolor: pink,
            color: ink,
            border: `2px solid ${ink}`,
            px: 0.85,
            py: 0.3,
            fontFamily: mono,
            fontWeight: 600,
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            boxShadow: `2px 2px 0 0 ${ink}`,
            transform: "rotate(3deg)",
            transition: "transform 100ms ease, box-shadow 100ms ease",
            "&:hover": {
              transform: "rotate(3deg) translate(-1px, -1px)",
              boxShadow: `3px 3px 0 0 ${ink}`,
            },
            "&:active": {
              transform: "rotate(3deg) translate(1px, 1px)",
              boxShadow: `1px 1px 0 0 ${ink}`,
            },
            "&:focus-visible": {
              outline: `2px solid ${blue}`,
              outlineOffset: 2,
            },
          }}
        >
          ▶ start
        </Box>
      )}
      <CardContent sx={{ py: 1.5, px: 1.75, "&:last-child": { pb: 1.5 } }}>
        <Typography
          sx={{
            fontFamily: display,
            fontWeight: 700,
            fontSize: 19,
            lineHeight: 1.05,
            textTransform: "uppercase",
            letterSpacing: "0.005em",
            color: ink,
            textDecoration: isDone ? "line-through" : "none",
            mb: 1,
            pr: showStart ? 7 : 0,
          }}
        >
          {chore.title}
        </Typography>

        <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", gap: 0.5, alignItems: "center" }}>
          <BadgeSticker color="ink">{estimateLabel}</BadgeSticker>
          {chore.area && <BadgeSticker color="blue">{chore.area}</BadgeSticker>}
          {chore.isRepeating && (
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.25,
                bgcolor: yellow,
                border: `1.5px solid ${ink}`,
                px: 0.5,
                py: 0.1,
                ml: "auto",
              }}
              title="repeats weekly"
            >
              <RepeatIcon sx={{ fontSize: 12, color: ink }} />
            </Box>
          )}
        </Stack>

        {steps.length > 0 && (
          <Box
            sx={{
              mt: 1.25,
              pt: 1,
              borderTop: `2px dashed ${ink}`,
            }}
          >
            <Stack spacing={0.25}>
              {steps.map((step, idx) => (
                <StepRow
                  key={step.id}
                  step={step}
                  choreId={chore.id}
                  isCurrent={currentStep?.id === step.id}
                  index={idx}
                />
              ))}
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

function BadgeSticker({
  children,
  color,
}: {
  children: React.ReactNode;
  color: "ink" | "blue" | "yellow" | "pink";
}) {
  const palette = {
    ink: { bg: ink, fg: bg },
    blue: { bg: blueSoft, fg: blue, border: blue },
    yellow: { bg: yellow, fg: ink },
    pink: { bg: pink, fg: ink },
  }[color];
  const borderColor = "border" in palette ? palette.border : ink;
  return (
    <Box
      component="span"
      sx={{
        display: "inline-block",
        bgcolor: palette.bg,
        color: palette.fg,
        border: `1.5px solid ${borderColor}`,
        px: 0.6,
        py: 0.1,
        fontFamily: mono,
        fontWeight: 500,
        fontSize: 10,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        lineHeight: 1.5,
      }}
    >
      {children}
    </Box>
  );
}

interface StepRowProps {
  step: Task;
  choreId: string;
  isCurrent: boolean;
  index: number;
}

function StepRow({ step, choreId, isCurrent, index }: StepRowProps) {
  const completed = step.completedAt !== null;
  const updateStep = useUpdateStep();

  function toggleCheck(e: React.MouseEvent) {
    e.stopPropagation();
    if (updateStep.isPending) return;
    updateStep.mutate({
      choreId,
      stepId: step.id,
      input: { completed: !completed },
    });
  }

  return (
    <Box
      sx={{
        bgcolor: isCurrent ? yellow : "transparent",
        borderLeft: isCurrent ? `3px solid ${ink}` : `3px solid transparent`,
        opacity: completed ? 0.5 : 1,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          px: 0.5,
          py: 0.35,
        }}
      >
        <Box
          component="button"
          onClick={toggleCheck}
          aria-label={
            completed ? `Uncheck step "${step.title}"` : `Mark step "${step.title}" done`
          }
          sx={{
            all: "unset",
            cursor: updateStep.isPending ? "default" : "pointer",
            color: ink,
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          {completed ? (
            <CheckBoxIcon sx={{ fontSize: 16, color: pink }} />
          ) : (
            <CheckBoxOutlineBlankIcon sx={{ fontSize: 16, color: ink }} />
          )}
        </Box>
        <Typography
          sx={{
            flexGrow: 1,
            fontFamily: mono,
            fontSize: 11.5,
            fontWeight: isCurrent ? 500 : 400,
            textDecoration: completed ? "line-through" : "none",
            color: completed ? inkFaint : ink,
            lineHeight: 1.3,
          }}
        >
          <Box
            component="span"
            sx={{
              color: isCurrent ? ink : inkDim,
              fontWeight: 500,
              mr: 0.75,
            }}
          >
            {String(index + 1).padStart(2, "0")}.
          </Box>
          {step.title}
        </Typography>
        <Typography
          sx={{
            fontFamily: mono,
            fontSize: 10,
            letterSpacing: "0.05em",
            color: completed ? inkFaint : inkDim,
            whiteSpace: "nowrap",
          }}
        >
          {step.estimateMinutes}m
        </Typography>
      </Box>
      {step.notes && step.notes.trim().length > 0 && (
        <Typography
          sx={{
            fontFamily: mono,
            fontSize: 10.5,
            color: inkDim,
            lineHeight: 1.35,
            pl: 3.25,
            pr: 1,
            pb: 0.5,
            whiteSpace: "pre-wrap",
            textDecoration: completed ? "line-through" : "none",
          }}
        >
          {step.notes}
        </Typography>
      )}
    </Box>
  );
}

function formatEstimate(chore: ChoreWithSteps): string {
  if (chore.steps.length === 0) {
    return `${chore.estimateMinutes} min`;
  }
  const total = chore.steps.reduce((acc, s) => acc + s.estimateMinutes, 0) + 5;
  return `~${Math.ceil(total)} min`;
}
