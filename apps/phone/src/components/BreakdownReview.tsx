import { useRef, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import RepeatIcon from "@mui/icons-material/Repeat";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import type { AcceptBreakdownInput, BreakdownPreview } from "@todoer/shared";

interface EditableStep {
  key: string;
  title: string;
  estimate: string;
  isRepeating: boolean;
}

interface BreakdownReviewProps {
  preview: BreakdownPreview;
  areas: string[];
  accepting: boolean;
  error: boolean;
  onAccept: (input: AcceptBreakdownInput) => void;
  onStartOver: () => void;
}

export function BreakdownReview({
  preview,
  areas,
  accepting,
  error,
  onAccept,
  onStartOver,
}: BreakdownReviewProps) {
  const keyCounter = useRef(0);
  const nextKey = () => `step-${keyCounter.current++}`;

  const [projectTitle, setProjectTitle] = useState(preview.projectTitle);
  const [area, setArea] = useState(preview.area);
  const [steps, setSteps] = useState<EditableStep[]>(() =>
    preview.steps.map((s) => ({
      key: nextKey(),
      title: s.title,
      estimate: String(s.estimateMinutes),
      isRepeating: false,
    })),
  );

  function updateStep(key: string, patch: Partial<EditableStep>) {
    setSteps((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }
  function removeStep(key: string) {
    setSteps((prev) => prev.filter((s) => s.key !== key));
  }
  function addStep() {
    setSteps((prev) => [
      ...prev,
      { key: nextKey(), title: "", estimate: "5", isRepeating: false },
    ]);
  }

  const allRepeating = steps.length > 0 && steps.every((s) => s.isRepeating);
  function toggleAllRepeating() {
    const next = !allRepeating;
    setSteps((prev) => prev.map((s) => ({ ...s, isRepeating: next })));
  }

  const validSteps = steps
    .map((s) => ({
      title: s.title.trim(),
      estimateMinutes: Number(s.estimate),
      isRepeating: s.isRepeating,
    }))
    .filter(
      (s) =>
        s.title.length > 0 &&
        Number.isInteger(s.estimateMinutes) &&
        s.estimateMinutes >= 1,
    );

  const canAccept =
    projectTitle.trim().length > 0 && validSteps.length > 0 && !accepting;

  return (
    <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        Here's the plan — tweak anything, then add it.
      </Typography>
      <TextField
        label="Task"
        value={projectTitle}
        onChange={(e) => setProjectTitle(e.target.value)}
        fullWidth
      />
      <Autocomplete
        freeSolo
        options={areas}
        value={area}
        onChange={(_, value) => setArea(value ?? "")}
        inputValue={area}
        onInputChange={(_, value) => setArea(value)}
        renderInput={(params) => <TextField {...params} label="Area" />}
      />
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "center" }}
      >
        <Typography variant="subtitle2" color="text.secondary">
          Steps ({validSteps.length})
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={allRepeating}
              onChange={toggleAllRepeating}
              size="small"
            />
          }
          label="Repeat all weekly"
          labelPlacement="start"
          sx={{
            ml: 0,
            "& .MuiFormControlLabel-label": {
              fontSize: 14,
              color: "text.secondary",
            },
          }}
        />
      </Stack>
      <Stack spacing={1}>
        {steps.map((step, index) => (
          <Stack
            key={step.key}
            direction="row"
            spacing={1}
            sx={{ alignItems: "flex-start" }}
          >
            <Typography sx={{ mt: 1.5, color: "text.secondary", minWidth: 22 }}>
              {index + 1}.
            </Typography>
            <TextField
              value={step.title}
              onChange={(e) => updateStep(step.key, { title: e.target.value })}
              placeholder="Step"
              size="small"
              fullWidth
              multiline
            />
            <TextField
              value={step.estimate}
              onChange={(e) => updateStep(step.key, { estimate: e.target.value })}
              type="number"
              size="small"
              sx={{
                width: 84,
                "& input[type=number]": { MozAppearance: "textfield" },
                "& input[type=number]::-webkit-outer-spin-button": {
                  WebkitAppearance: "none",
                  margin: 0,
                },
                "& input[type=number]::-webkit-inner-spin-button": {
                  WebkitAppearance: "none",
                  margin: 0,
                },
              }}
            />
            <Tooltip
              title={step.isRepeating ? "Repeats weekly" : "Tap if this repeats weekly"}
            >
              <IconButton
                onClick={() =>
                  updateStep(step.key, { isRepeating: !step.isRepeating })
                }
                aria-label="Repeats weekly"
                size="small"
                sx={{
                  mt: 0.5,
                  color: step.isRepeating ? "primary.main" : "text.disabled",
                }}
              >
                <RepeatIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <IconButton
              onClick={() => removeStep(step.key)}
              aria-label="Remove step"
              size="small"
              sx={{ mt: 0.5 }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        ))}
      </Stack>
      <Button startIcon={<AddIcon />} onClick={addStep} sx={{ alignSelf: "flex-start" }}>
        Add a step
      </Button>
      {error && <Alert severity="error">Couldn't add these tasks. Try again.</Alert>}
      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        <Button onClick={onStartOver} disabled={accepting}>
          Start over
        </Button>
        <Button
          variant="contained"
          fullWidth
          disabled={!canAccept}
          onClick={() =>
            onAccept({
              projectTitle: projectTitle.trim(),
              area: area.trim() || "General",
              steps: validSteps,
            })
          }
        >
          Add {validSteps.length} {validSteps.length === 1 ? "task" : "tasks"} to Ready
        </Button>
      </Stack>
    </Box>
  );
}
