import { useState } from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {
  Alert,
  AppBar,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router";
import { ApiError, type AcceptBreakdownInput, type BreakdownPreview } from "@todoer/shared";
import { BreakdownReview } from "../components/BreakdownReview";
import {
  useAcceptBreakdown,
  useAreas,
  useBreakdown,
  useCreateTask,
} from "../lib/api-hooks";

export function AddScreen() {
  const navigate = useNavigate();
  const areas = useAreas();
  const breakdown = useBreakdown();
  const accept = useAcceptBreakdown();
  const createTask = useCreateTask();

  const [text, setText] = useState("");
  const [preview, setPreview] = useState<BreakdownPreview | null>(null);
  const [clarification, setClarification] = useState<string | null>(null);
  const [aiUnavailable, setAiUnavailable] = useState(false);

  const [manualTitle, setManualTitle] = useState("");
  const [manualEstimate, setManualEstimate] = useState("10");
  const [manualArea, setManualArea] = useState("");

  function runBreakdown() {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    setClarification(null);
    setAiUnavailable(false);
    breakdown.mutate(trimmed, {
      onSuccess: (result) => setPreview(result),
      onError: (err) => {
        if (err instanceof ApiError && err.status === 422) {
          const detail = err.detail as { clarification?: string } | undefined;
          setClarification(
            detail?.clarification ?? "Could you add a little more detail?",
          );
        } else {
          setAiUnavailable(true);
          if (manualTitle.trim().length === 0) setManualTitle(trimmed);
        }
      },
    });
  }

  function handleAccept(input: AcceptBreakdownInput) {
    accept.mutate(input, { onSuccess: () => navigate("/") });
  }

  function addManual() {
    const estimateNum = Number(manualEstimate);
    if (
      manualTitle.trim().length === 0 ||
      !Number.isInteger(estimateNum) ||
      estimateNum < 1
    ) {
      return;
    }
    createTask.mutate(
      {
        title: manualTitle.trim(),
        estimateMinutes: estimateNum,
        area: manualArea.trim() || null,
      },
      { onSuccess: () => navigate("/") },
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100dvh" }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate("/")}
            aria-label="Back"
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6">Add tasks</Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ flexGrow: 1, overflowY: "auto" }}>
        {preview ? (
          <BreakdownReview
            preview={preview}
            areas={areas.data ?? []}
            accepting={accept.isPending}
            error={accept.isError}
            onAccept={handleAccept}
            onStartOver={() => setPreview(null)}
          />
        ) : (
          <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              What do you want to get done?
            </Typography>
            <TextField
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. Clean the kitchen"
              multiline
              minRows={2}
              fullWidth
              autoFocus
            />
            <Button
              variant="contained"
              startIcon={
                breakdown.isPending ? (
                  <CircularProgress size={18} color="inherit" />
                ) : undefined
              }
              onClick={runBreakdown}
              disabled={text.trim().length === 0 || breakdown.isPending}
            >
              {breakdown.isPending ? "Breaking it down…" : "Break it down with AI"}
            </Button>
            {clarification && <Alert severity="info">{clarification}</Alert>}
            {aiUnavailable && (
              <Alert severity="warning">
                Couldn't reach the AI right now — add it as a single task below.
              </Alert>
            )}

            <Divider sx={{ color: "text.secondary" }}>or add just one task</Divider>

            <TextField
              label="Task"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              fullWidth
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Minutes"
                type="number"
                value={manualEstimate}
                onChange={(e) => setManualEstimate(e.target.value)}
                sx={{ width: 120 }}
              />
              <Autocomplete
                freeSolo
                fullWidth
                options={areas.data ?? []}
                inputValue={manualArea}
                onInputChange={(_, value) => setManualArea(value)}
                renderInput={(params) => (
                  <TextField {...params} label="Area (optional)" />
                )}
              />
            </Stack>
            {createTask.isError && (
              <Alert severity="error">Couldn't add the task.</Alert>
            )}
            <Button
              variant="outlined"
              onClick={addManual}
              disabled={manualTitle.trim().length === 0 || createTask.isPending}
            >
              Add this one task
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}
