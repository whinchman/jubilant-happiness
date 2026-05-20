import { useState } from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router";
import { ApiError, type AcceptBreakdownInput, type BreakdownPreview } from "@todoer/shared";
import { BreakdownReview } from "../components/BreakdownReview";
import { Sticker } from "../components/Chrome";
import {
  useAcceptBreakdown,
  useAreas,
  useBreakdown,
  useCreateTask,
} from "../lib/api-hooks";
import {
  bg,
  blue,
  display,
  ink,
  inkDim,
  mono,
  pink,
  yellow,
} from "../theme";

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
          setClarification(detail?.clarification ?? "could you add a little more detail?");
        } else {
          setAiUnavailable(true);
          if (manualTitle.trim().length === 0) setManualTitle(trimmed);
        }
      },
    });
  }

  function handleAccept(input: AcceptBreakdownInput) {
    accept.mutate(input, { onSuccess: () => navigate("/board") });
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
      { onSuccess: () => navigate("/board") },
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <Box sx={{ bgcolor: ink, color: bg }}>
        <Toolbar sx={{ minHeight: 56, px: 1 }}>
          <IconButton
            edge="start"
            onClick={() => navigate("/board")}
            aria-label="Back"
            sx={{ color: bg, "&:hover": { color: pink } }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography
            sx={{
              fontFamily: display,
              fontWeight: 900,
              fontSize: 22,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            add_a_chore
            <Box component="span" sx={{ color: pink }}>.</Box>
          </Typography>
        </Toolbar>
      </Box>

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
          <Box
            sx={{
              p: 3,
              display: "flex",
              flexDirection: "column",
              gap: 2.5,
              maxWidth: 540,
              mx: "auto",
            }}
          >
            <Box>
              <Sticker color="pink" rotate={-2}>
                ai breakdown
              </Sticker>
              <Typography
                sx={{
                  fontFamily: display,
                  fontWeight: 900,
                  fontSize: 38,
                  lineHeight: 0.95,
                  textTransform: "uppercase",
                  letterSpacing: "-0.01em",
                  mt: 1.5,
                  textShadow: `2px 2px 0 ${pink}, -2px -2px 0 ${blue}`,
                }}
              >
                what needs{" "}
                <Box component="span" sx={{ color: pink }}>
                  doing?
                </Box>
              </Typography>
              <Typography
                sx={{
                  fontFamily: mono,
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: inkDim,
                  mt: 1.5,
                  letterSpacing: "0.04em",
                }}
              >
                type a big thing. claude chops it into ≤10-min steps.
              </Typography>
            </Box>

            <TextField
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. clean the kitchen"
              multiline
              minRows={3}
              fullWidth
              autoFocus
            />
            <Button
              variant="contained"
              size="large"
              startIcon={
                breakdown.isPending ? (
                  <CircularProgress size={18} sx={{ color: yellow }} />
                ) : undefined
              }
              onClick={runBreakdown}
              disabled={text.trim().length === 0 || breakdown.isPending}
              sx={{
                py: 2.25,
                fontSize: 18,
                justifyContent: "space-between",
              }}
            >
              <Box component="span">
                {breakdown.isPending ? "breaking it down…" : "break it down with ai"}
              </Box>
              {!breakdown.isPending && (
                <Box
                  component="span"
                  sx={{
                    fontFamily: display,
                    fontWeight: 900,
                    fontSize: 24,
                    color: yellow,
                  }}
                >
                  →
                </Box>
              )}
            </Button>
            {clarification && <Alert severity="info">{clarification}</Alert>}
            {aiUnavailable && (
              <Alert severity="warning">
                {breakdown.error instanceof ApiError && breakdown.error.status === 429
                  ? "hit the breakdown rate limit — add a single task below for now."
                  : "couldn't reach the ai — add a single task below."}
              </Alert>
            )}

            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 1 }}>
              <Box sx={{ flexGrow: 1, borderTop: `2px dashed ${ink}` }} />
              <Typography
                sx={{
                  fontFamily: mono,
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: inkDim,
                }}
              >
                or just one
              </Typography>
              <Box sx={{ flexGrow: 1, borderTop: `2px dashed ${ink}` }} />
            </Box>

            <TextField
              label="title"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              fullWidth
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="minutes"
                type="number"
                value={manualEstimate}
                onChange={(e) => setManualEstimate(e.target.value)}
                sx={{ width: 130 }}
              />
              <Autocomplete
                freeSolo
                fullWidth
                options={areas.data ?? []}
                value={manualArea}
                onChange={(_, value) => setManualArea(value ?? "")}
                inputValue={manualArea}
                onInputChange={(_, value) => setManualArea(value)}
                renderInput={(params) => (
                  <TextField {...params} label="area (optional)" />
                )}
              />
            </Stack>
            {createTask.isError && (
              <Alert severity="error">couldn't add the task. try again.</Alert>
            )}
            <Button
              variant="outlined"
              size="large"
              onClick={addManual}
              disabled={manualTitle.trim().length === 0 || createTask.isPending}
              sx={{ py: 1.5, fontSize: 14 }}
            >
              add this one task
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}
