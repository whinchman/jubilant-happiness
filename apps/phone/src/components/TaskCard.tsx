import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlined";
import RepeatIcon from "@mui/icons-material/Repeat";
import {
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import type { ChoreWithSteps, Task } from "@todoer/shared";
import { useUpdateStep } from "../lib/api-hooks";

interface TaskCardProps {
  chore: ChoreWithSteps;
  onClick?: () => void;
}

export function TaskCard({ chore, onClick }: TaskCardProps) {
  const steps = chore.steps;
  const currentStep = steps.find((s) => s.completedAt === null) ?? null;
  const estimateLabel = formatEstimate(chore);

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }} onClick={onClick}>
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
          {chore.title}
        </Typography>
        <Box
          sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, alignItems: "center" }}
        >
          <Chip label={estimateLabel} size="small" />
          {chore.area && (
            <Chip
              label={chore.area}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
          {chore.isRepeating && (
            <RepeatIcon
              fontSize="small"
              sx={{ color: "text.secondary", ml: "auto" }}
            />
          )}
        </Box>
        {steps.length > 0 && (
          <Stack spacing={0.5} sx={{ mt: 1.25 }}>
            {steps.map((step) => (
              <StepRow
                key={step.id}
                step={step}
                choreId={chore.id}
                isCurrent={currentStep?.id === step.id}
              />
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

interface StepRowProps {
  step: Task;
  choreId: string;
  isCurrent: boolean;
}

function StepRow({ step, choreId, isCurrent }: StepRowProps) {
  const completed = step.completedAt !== null;
  const updateStep = useUpdateStep();

  function handleCheck(e: React.MouseEvent) {
    e.stopPropagation();
    updateStep.mutate({ choreId, stepId: step.id, input: { completed: true } });
  }

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        px: 0.75,
        py: 0.5,
        borderRadius: 1,
        border: isCurrent ? "2px solid" : "2px solid transparent",
        borderColor: isCurrent ? "primary.main" : "transparent",
        bgcolor: isCurrent ? "rgba(103,80,164,0.08)" : "transparent",
        opacity: completed ? 0.45 : 1,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          flexGrow: 1,
          fontWeight: isCurrent ? 600 : 400,
          textDecoration: completed ? "line-through" : "none",
          color: completed ? "text.disabled" : "text.primary",
        }}
      >
        {step.title}
      </Typography>
      <Typography
        variant="caption"
        sx={{ color: "text.secondary", whiteSpace: "nowrap" }}
      >
        {step.estimateMinutes}m
      </Typography>
      {isCurrent && (
        <IconButton
          size="small"
          aria-label={`Mark step "${step.title}" done`}
          onClick={handleCheck}
          disabled={updateStep.isPending}
          sx={{ ml: 0.25, p: 0.25 }}
        >
          <CheckCircleOutlineIcon fontSize="small" color="primary" />
        </IconButton>
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
