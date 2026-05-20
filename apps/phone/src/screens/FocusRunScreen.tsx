import { useEffect, useReducer, useState, type ReactNode } from "react";
import { Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { useLocation, useNavigate } from "react-router";
import type { FocusItem } from "@todoer/shared";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Sticker } from "../components/Chrome";
import { blue, display, ink, mono, pink } from "../theme";
import {
  ActiveTaskView,
  AreaCompleteView,
  BreakView,
  FinishView,
} from "../components/focus-views";
import {
  useGetStartedSession,
  useMoveTask,
  useUpdateStep,
} from "../lib/api-hooks";

type Phase = "loading" | "empty" | "task" | "break" | "areaComplete" | "finish";

interface RunState {
  phase: Phase;
  session: FocusItem[];
  index: number;
  startedAt: number;
  segmentStartedAt: number;
  sinceBreakAt: number;
  completed: number;
  breakMs: number;
  finishedAt: number;
  /** True if the run ended via mid-cycle Abandon; false on natural Finish. */
  cancelled: boolean;
}

type RunAction =
  | { type: "loaded"; session: FocusItem[]; now: number }
  | { type: "complete"; now: number; workMs: number }
  | { type: "endBreak"; now: number }
  | { type: "endRun"; now: number; cancelled: boolean }
  | { type: "continueSession"; session: FocusItem[]; now: number };

const INITIAL: RunState = {
  phase: "loading",
  session: [],
  index: 0,
  startedAt: 0,
  segmentStartedAt: 0,
  sinceBreakAt: 0,
  completed: 0,
  breakMs: 0,
  finishedAt: 0,
  cancelled: false,
};

function reducer(state: RunState, action: RunAction): RunState {
  switch (action.type) {
    case "loaded":
      if (action.session.length === 0) return { ...state, phase: "empty" };
      return {
        ...state,
        phase: "task",
        session: action.session,
        index: 0,
        startedAt: action.now,
        segmentStartedAt: action.now,
        sinceBreakAt: action.now,
      };
    case "complete": {
      const completed = state.completed + 1;
      const next = state.index + 1;
      // Last task in the current area → offer Continue/Finish before ending the run.
      if (next >= state.session.length) {
        return { ...state, phase: "areaComplete", completed };
      }
      const dueForBreak = action.now - state.sinceBreakAt >= action.workMs;
      return {
        ...state,
        completed,
        index: next,
        phase: dueForBreak ? "break" : "task",
        segmentStartedAt: action.now,
      };
    }
    case "endBreak":
      return {
        ...state,
        phase: "task",
        breakMs: state.breakMs + (action.now - state.segmentStartedAt),
        segmentStartedAt: action.now,
        sinceBreakAt: action.now,
      };
    case "endRun":
      return {
        ...state,
        phase: "finish",
        finishedAt: action.now,
        cancelled: action.cancelled,
      };
    case "continueSession":
      // Carry stats forward; just swap in the new session and restart the task loop.
      if (action.session.length === 0) {
        return {
          ...state,
          phase: "finish",
          finishedAt: action.now,
          cancelled: false,
        };
      }
      return {
        ...state,
        phase: "task",
        session: action.session,
        index: 0,
        segmentStartedAt: action.now,
      };
  }
}

export function FocusRunScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const settings = location.state as
    | {
        workMinutes?: number;
        breakMinutes?: number;
        /** When set (e.g. via the board's per-card START button), skips the
         * /focus/get-started fetch and runs just this preloaded session. */
        session?: FocusItem[];
      }
    | null;
  const workMs = (settings?.workMinutes ?? 20) * 60_000;
  const breakMs = (settings?.breakMinutes ?? 5) * 60_000;
  const [initialSession] = useState<FocusItem[] | null>(
    () => settings?.session ?? null,
  );

  const session = useGetStartedSession(initialSession === null);
  const moveTask = useMoveTask();
  const updateStep = useUpdateStep();
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const [now, setNow] = useState(() => Date.now());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [continuing, setContinuing] = useState(false);

  useEffect(() => {
    if (state.phase !== "loading") return;
    if (initialSession) {
      dispatch({ type: "loaded", session: initialSession, now: Date.now() });
    } else if (session.data) {
      dispatch({ type: "loaded", session: session.data, now: Date.now() });
    }
  }, [state.phase, session.data, initialSession]);

  useEffect(() => {
    if (state.phase !== "task" && state.phase !== "break") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state.phase]);

  useEffect(() => {
    if (state.phase === "break" && now - state.segmentStartedAt >= breakMs) {
      dispatch({ type: "endBreak", now: Date.now() });
    }
  }, [now, state.phase, state.segmentStartedAt, breakMs]);

  function completeCurrent() {
    const item = state.session[state.index];
    if (item) {
      if (item.kind === "step") {
        // Checking the step also calls reconcileChoreLane server-side; if it's
        // the chore's last step, the chore auto-promotes Doing → Done.
        updateStep.mutate({
          choreId: item.chore.id,
          stepId: item.step.id,
          input: { completed: true },
        });
      } else {
        moveTask.mutate({ id: item.chore.id, input: { lane: "done" } });
      }
    }
    dispatch({ type: "complete", now: Date.now(), workMs });
  }

  async function continueWithNextArea() {
    setContinuing(true);
    try {
      const result = await session.refetch();
      dispatch({
        type: "continueSession",
        session: result.data ?? [],
        now: Date.now(),
      });
    } finally {
      setContinuing(false);
    }
  }

  function confirmAbandon() {
    setConfirmOpen(false);
    dispatch({ type: "endRun", now: Date.now(), cancelled: true });
  }

  if (state.phase === "loading") {
    return (
      <Centered>
        {session.isError ? (
          <Stack spacing={2} sx={{ alignItems: "center", textAlign: "center" }}>
            <Sticker color="pink" rotate={-3}>server down?</Sticker>
            <Typography
              sx={{
                fontFamily: display,
                fontWeight: 800,
                fontSize: 28,
                textTransform: "uppercase",
                letterSpacing: "-0.005em",
              }}
            >
              couldn't start.
            </Typography>
            <Typography
              sx={{
                fontFamily: mono,
                fontSize: 12,
                letterSpacing: "0.08em",
                color: "text.secondary",
              }}
            >
              is the server running?
            </Typography>
            <Button variant="outlined" onClick={() => navigate("/")}>back home</Button>
          </Stack>
        ) : (
          <CircularProgress />
        )}
      </Centered>
    );
  }

  if (state.phase === "empty") {
    return (
      <Centered>
        <Stack
          spacing={2}
          sx={{ alignItems: "center", textAlign: "center", px: 4, maxWidth: 380 }}
        >
          <Sticker color="yellow" rotate={-4}>no chores ready</Sticker>
          <Typography
            sx={{
              fontFamily: display,
              fontWeight: 900,
              fontSize: 48,
              lineHeight: 0.95,
              textTransform: "uppercase",
              letterSpacing: "-0.01em",
              textShadow: `2px 2px 0 ${pink}, -2px -2px 0 ${blue}`,
              mt: 1,
            }}
          >
            empty<Box component="span" sx={{ color: pink }}>.</Box>
          </Typography>
          <Typography
            sx={{
              fontFamily: mono,
              fontSize: 13,
              lineHeight: 1.5,
              color: "text.secondary",
            }}
          >
            move a few chores into the to_do lane, then start a session.
          </Typography>
          <Button variant="contained" size="large" onClick={() => navigate("/board")} sx={{ py: 1.75, mt: 1 }}>
            go to the board →
          </Button>
          <Button variant="text" onClick={() => navigate("/")} sx={{ color: ink }}>
            back home
          </Button>
        </Stack>
      </Centered>
    );
  }

  const current = state.session[state.index];

  return (
    <>
      {state.phase === "task" && current && (
        <ActiveTaskView
          item={current}
          elapsedMs={now - state.segmentStartedAt}
          onComplete={completeCurrent}
          onAbandon={() => setConfirmOpen(true)}
        />
      )}
      {state.phase === "break" && (
        <BreakView
          remainingMs={breakMs - (now - state.segmentStartedAt)}
          onResume={() => dispatch({ type: "endBreak", now: Date.now() })}
          onAbandon={() => setConfirmOpen(true)}
        />
      )}
      {state.phase === "areaComplete" && (
        <AreaCompleteView
          completed={state.completed}
          onContinue={continueWithNextArea}
          onFinish={() =>
            dispatch({ type: "endRun", now: Date.now(), cancelled: false })
          }
          continuing={continuing}
        />
      )}
      {state.phase === "finish" && (
        <FinishView
          completed={state.completed}
          totalElapsedMs={state.finishedAt - state.startedAt}
          totalBreakMs={state.breakMs}
          cancelled={state.cancelled}
          onDone={() => navigate("/")}
        />
      )}
      <ConfirmDialog
        open={confirmOpen}
        title="end this session?"
        message="you can always start another one."
        confirmLabel="end it"
        confirmColor="error"
        onConfirm={confirmAbandon}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ height: "100dvh", display: "grid", placeItems: "center" }}>
      {children}
    </Box>
  );
}
