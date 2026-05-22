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

  function sendTurn(forceFinalize: boolean) {
    if (state.kind !== "chat") return;
    if (!forceFinalize && state.draft.trim().length === 0) return;
    const userMessages = forceFinalize
      ? state.messages
      : [...state.messages, { role: "user", content: state.draft.trim() } as ChatMessage];

    // Optimistically show the user's message immediately.
    if (!forceFinalize) {
      setState({ ...state, messages: userMessages, draft: "", error: null });
    } else {
      setState({ ...state, error: null });
    }
    turn.mutate(
      { messages: userMessages, forceFinalize },
      {
        onSuccess: (resp) => {
          if (resp.kind === "question") {
            setState({
              kind: "chat",
              messages: [
                ...userMessages,
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
          const msg =
            err instanceof ApiError && err.status === 429
              ? "hit the mega chore kit rate limit — try again in a bit."
              : "couldn't reach the ai — try again.";
          setState((prev) =>
            prev.kind === "chat" ? { ...prev, error: msg } : prev,
          );
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
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
              maxWidth: 540,
              mx: "auto",
              width: "100%",
            }}
          >
            <Box
              sx={{
                position: "sticky",
                top: 0,
                bgcolor: bg,
                borderBottom: `2px solid ${ink}`,
                px: 2,
                py: 1.25,
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <Button
                variant="outlined"
                size="small"
                disabled={turn.isPending}
                onClick={() => sendTurn(true)}
                sx={{ fontFamily: mono, fontSize: 12 }}
              >
                just give me the breakdown
              </Button>
            </Box>

            <Box sx={{ flexGrow: 1, overflowY: "auto", p: 2 }}>
              <Stack spacing={1.5}>
                {state.messages.map((m, i) => (
                  <Box
                    key={i}
                    sx={{
                      alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                      bgcolor: m.role === "user" ? ink : pink,
                      color: m.role === "user" ? bg : ink,
                      border: `2px solid ${ink}`,
                      px: 1.5,
                      py: 1,
                      maxWidth: "80%",
                      fontFamily: mono,
                      fontSize: 13,
                      lineHeight: 1.4,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {m.content}
                  </Box>
                ))}
                {turn.isPending && (
                  <Box sx={{ alignSelf: "flex-start", color: inkDim, fontFamily: mono, fontSize: 12 }}>
                    thinking…
                  </Box>
                )}
              </Stack>
            </Box>

            <Box sx={{ p: 2, borderTop: `2px solid ${ink}`, bgcolor: bg }}>
              {state.error && (
                <Alert severity="warning" sx={{ mb: 1 }}>{state.error}</Alert>
              )}
              <Stack direction="row" spacing={1}>
                <TextField
                  value={state.draft}
                  onChange={(e) =>
                    setState({ ...state, draft: e.target.value })
                  }
                  placeholder="reply…"
                  multiline
                  maxRows={4}
                  fullWidth
                  disabled={turn.isPending}
                />
                <Button
                  variant="contained"
                  disabled={turn.isPending || state.draft.trim().length === 0}
                  onClick={() => sendTurn(false)}
                >
                  send
                </Button>
              </Stack>
            </Box>
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
