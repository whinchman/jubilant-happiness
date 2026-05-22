import { useState } from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router";
import {
  ApiError,
  type ChatMessage,
  type MegaChoreBreakdownPreview,
} from "@todoer/shared";
import { Sticker } from "../../components/Chrome";
import {
  bg,
  blue,
  display,
  ink,
  inkDim,
  mono,
  pink,
  yellow,
} from "../../theme";
import { useMegaChoreTurn } from "./use-mega-chore-turn";

type ScreenState =
  | { kind: "initial"; text: string }
  | {
      kind: "chat";
      messages: ChatMessage[];
      draft: string;
      error: string | null;
    }
  | { kind: "review"; preview: MegaChoreBreakdownPreview };

export function MegaChoreKitScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const turn = useMegaChoreTurn();

  const prefill =
    typeof (location.state as { prefillText?: unknown } | null)?.prefillText ===
    "string"
      ? ((location.state as { prefillText: string }).prefillText)
      : "";

  const [state, setState] = useState<ScreenState>({
    kind: "initial",
    text: prefill,
  });
  const [topError, setTopError] = useState<string | null>(null);

  function startChat() {
    if (state.kind !== "initial") return;
    const trimmed = state.text.trim();
    if (trimmed.length === 0) return;
    setTopError(null);
    const messages: ChatMessage[] = [{ role: "user", content: trimmed }];
    turn.mutate(
      { messages },
      {
        onSuccess: (resp) => {
          if (resp.kind === "question") {
            setState({
              kind: "chat",
              messages: [
                ...messages,
                { role: "assistant", content: resp.assistantMessage },
              ],
              draft: "",
              error: null,
            });
          } else {
            setState({ kind: "review", preview: resp.preview });
          }
        },
        onError: (err) => {
          if (err instanceof ApiError && err.status === 429) {
            setTopError("hit the mega chore kit rate limit — try again in a bit.");
          } else {
            setTopError("couldn't reach the ai — try again.");
          }
        },
      },
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <Box sx={{ bgcolor: ink, color: bg }}>
        <Toolbar sx={{ minHeight: 56, px: 1 }}>
          <IconButton
            edge="start"
            onClick={() => navigate("/add/kit")}
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
            mega_chore_kit
            <Box component="span" sx={{ color: pink }}>.</Box>
          </Typography>
        </Toolbar>
      </Box>

      <Box sx={{ flexGrow: 1, overflowY: "auto" }}>
        {state.kind === "initial" && (
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
                describe it
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
                what's the{" "}
                <Box component="span" sx={{ color: pink }}>
                  huge thing?
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
                claude will ask a few quick questions, then split it into chores you can do in order. (chat does not save if you leave.)
              </Typography>
            </Box>

            <TextField
              label="the mega chore"
              value={state.text}
              onChange={(e) => setState({ kind: "initial", text: e.target.value })}
              multiline
              minRows={3}
              fullWidth
              autoFocus
              slotProps={{ htmlInput: { maxLength: 500 } }}
            />

            <Button
              variant="contained"
              size="large"
              startIcon={
                turn.isPending ? (
                  <CircularProgress size={18} sx={{ color: yellow }} />
                ) : undefined
              }
              onClick={startChat}
              disabled={turn.isPending || state.text.trim().length === 0}
              sx={{ py: 2.25, fontSize: 18, justifyContent: "space-between" }}
            >
              <Box component="span">
                {turn.isPending ? "thinking…" : "start"}
              </Box>
              {!turn.isPending && (
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

            {topError && <Alert severity="warning">{topError}</Alert>}
          </Box>
        )}
        {state.kind === "chat" && (
          <Box sx={{ p: 3, color: inkDim }}>
            <Typography>chat state — TBD next task</Typography>
            <Stack sx={{ mt: 2 }} spacing={1}>
              {state.messages.map((m, i) => (
                <Box key={i} sx={{ fontFamily: mono, fontSize: 12 }}>
                  <b>{m.role}:</b> {m.content}
                </Box>
              ))}
            </Stack>
          </Box>
        )}
        {state.kind === "review" && (
          <Box sx={{ p: 3, color: inkDim }}>
            <Typography>review state — TBD next task</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
