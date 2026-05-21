import { useRef, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
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
  Typography,
} from "@mui/material";
import type { AcceptBreakdownInput, BreakdownPreview } from "@todoer/shared";
import { Sticker } from "./Chrome";
import {
  bg,
  blue,
  bgCard,
  display,
  ink,
  inkDim,
  mono,
  pink,
  yellow,
} from "../theme";

interface EditableStep {
  key: string;
  title: string;
  estimate: string;
  notes: string;
  notesExpanded: boolean;
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
  const [isRepeating, setIsRepeating] = useState(false);
  const [steps, setSteps] = useState<EditableStep[]>(() =>
    preview.steps.map((s) => ({
      key: nextKey(),
      title: s.title,
      estimate: String(s.estimateMinutes),
      notes: s.notes ?? "",
      notesExpanded: false,
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
      { key: nextKey(), title: "", estimate: "5", notes: "", notesExpanded: false },
    ]);
  }

  const validSteps = steps
    .map((s) => ({
      title: s.title.trim(),
      estimateMinutes: Number(s.estimate),
      notes: s.notes.trim() || undefined,
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
    <Box
      sx={{
        p: 3,
        display: "flex",
        flexDirection: "column",
        gap: 2.5,
        maxWidth: 560,
        mx: "auto",
      }}
    >
      <Box>
        <Sticker color="yellow" rotate={-2}>
          here's the plan
        </Sticker>
        <Typography
          sx={{
            fontFamily: display,
            fontWeight: 900,
            fontSize: 36,
            lineHeight: 0.95,
            textTransform: "uppercase",
            letterSpacing: "-0.01em",
            mt: 1.5,
            textShadow: `2px 2px 0 ${pink}, -2px -2px 0 ${blue}`,
          }}
        >
          tweak it,
          <br />
          <Box component="span" sx={{ color: pink }}>
            then ship it.
          </Box>
        </Typography>
      </Box>

      <TextField
        label="chore"
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
        renderInput={(params) => <TextField {...params} label="area" />}
      />
      <FormControlLabel
        control={
          <Switch
            checked={isRepeating}
            onChange={(e) => setIsRepeating(e.target.checked)}
            size="small"
          />
        }
        label={
          <Typography
            sx={{
              fontFamily: mono,
              fontSize: 12.5,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: ink,
            }}
          >
            this chore repeats weekly
          </Typography>
        }
      />

      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 1 }}>
        <Typography
          sx={{
            fontFamily: display,
            fontWeight: 800,
            fontSize: 20,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          steps
        </Typography>
        <Box sx={{ flexGrow: 1, borderTop: `2px dashed ${ink}` }} />
        <Sticker color="blue" rotate={-2} size="sm">
          {String(validSteps.length).padStart(2, "0")} valid
        </Sticker>
      </Box>

      <Stack spacing={1.25}>
        {steps.map((step, index) => (
          <Box
            key={step.key}
            sx={{
              bgcolor: bgCard,
              border: `2px solid ${ink}`,
              p: 1,
            }}
          >
            <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
              <Box
                sx={{
                  bgcolor: ink,
                  color: bg,
                  fontFamily: display,
                  fontWeight: 800,
                  fontSize: 18,
                  px: 0.75,
                  py: 0.5,
                  minWidth: 32,
                  textAlign: "center",
                  lineHeight: 1.1,
                }}
              >
                {String(index + 1).padStart(2, "0")}
              </Box>
              <TextField
                value={step.title}
                onChange={(e) => updateStep(step.key, { title: e.target.value })}
                placeholder="step"
                size="small"
                fullWidth
                multiline
                sx={{
                  "& .MuiOutlinedInput-root": { borderWidth: 0 },
                  "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                }}
              />
              <TextField
                value={step.estimate}
                onChange={(e) => updateStep(step.key, { estimate: e.target.value })}
                type="number"
                size="small"
                sx={{
                  width: 70,
                  "& input": { textAlign: "right" },
                  "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                }}
              />
              <Typography
                sx={{
                  fontFamily: mono,
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: inkDim,
                  alignSelf: "center",
                  pr: 0.5,
                }}
              >
                m
              </Typography>
              <IconButton
                onClick={() => removeStep(step.key)}
                aria-label="Remove step"
                size="small"
                sx={{ alignSelf: "flex-start", "&:hover": { color: pink } }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
            {(step.notes.length > 0 || step.notesExpanded) ? (
              <TextField
                value={step.notes}
                onChange={(e) => updateStep(step.key, { notes: e.target.value })}
                placeholder="items in this step (comma-separated)"
                size="small"
                fullWidth
                multiline
                sx={{
                  mt: 0.75,
                  "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                  "& textarea": {
                    fontFamily: mono,
                    fontSize: 11,
                    color: inkDim,
                  },
                }}
              />
            ) : (
              <Box
                role="button"
                tabIndex={0}
                onClick={() => updateStep(step.key, { notesExpanded: true })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    updateStep(step.key, { notesExpanded: true });
                  }
                }}
                sx={{
                  mt: 0.5,
                  fontFamily: mono,
                  fontSize: 10,
                  color: inkDim,
                  cursor: "pointer",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                + add items
              </Box>
            )}
          </Box>
        ))}
      </Stack>
      <Button
        startIcon={<AddIcon />}
        onClick={addStep}
        variant="outlined"
        sx={{ alignSelf: "flex-start", py: 1 }}
      >
        add a step
      </Button>
      {error && (
        <Alert severity="error">couldn't add this chore. try again.</Alert>
      )}
      <Stack direction="row" spacing={1.5} sx={{ mt: 1 }}>
        <Button
          onClick={onStartOver}
          disabled={accepting}
          variant="outlined"
          size="large"
          sx={{ py: 1.75 }}
        >
          start over
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
              isRepeating,
            })
          }
          size="large"
          sx={{ py: 1.75, fontSize: 16, justifyContent: "space-between" }}
        >
          <Box component="span">
            add chore · {validSteps.length} {validSteps.length === 1 ? "step" : "steps"}
          </Box>
          <Box
            component="span"
            sx={{ fontFamily: display, fontWeight: 900, fontSize: 22, color: yellow }}
          >
            →
          </Box>
        </Button>
      </Stack>
    </Box>
  );
}
