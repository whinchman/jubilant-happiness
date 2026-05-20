import { useEffect, useReducer, useState, type ReactNode } from "react";
import { Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { useLocation, useNavigate } from "react-router";
import type { Task } from "@todoer/shared";
import { ConfirmDialog } from "../components/ConfirmDialog";
import {
  ActiveTaskView,
  AreaCompleteView,
  BreakView,
  FinishView,
} from "../components/focus-views";
import { useGetStartedSession, useMoveTask } from "../lib/api-hooks";

type Phase = "loading" | "empty" | "task" | "break" | "areaComplete" | "finish";

interface RunState {
  phase: Phase;
  session: Task[];
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
  | { type: "loaded"; session: Task[]; now: number }
  | { type: "complete"; now: number; workMs: number }
  | { type: "endBreak"; now: number }
  | { type: "endRun"; now: number; cancelled: boolean }
  | { type: "continueSession"; session: Task[]; now: number };

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
    | { workMinutes?: number; breakMinutes?: number }
    | null;
  const workMs = (settings?.workMinutes ?? 20) * 60_000;
  const breakMs = (settings?.breakMinutes ?? 5) * 60_000;

  const session = useGetStartedSession();
  const moveTask = useMoveTask();
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const [now, setNow] = useState(() => Date.now());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [continuing, setContinuing] = useState(false);

  useEffect(() => {
    if (state.phase === "loading" && session.data) {
      dispatch({ type: "loaded", session: session.data, now: Date.now() });
    }
  }, [state.phase, session.data]);

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
    const task = state.session[state.index];
    if (task) moveTask.mutate({ id: task.id, input: { lane: "done" } });
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
          <Stack spacing={2} sx={{ alignItems: "center" }}>
            <Typography color="error">
              Couldn't start a session. Is the server running?
            </Typography>
            <Button onClick={() => navigate("/")}>Back home</Button>
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
        <Stack spacing={2} sx={{ alignItems: "center", textAlign: "center", px: 4 }}>
          <Typography variant="h6">Nothing's ready yet</Typography>
          <Typography color="text.secondary">
            Move a few tasks into the Ready lane, then start a session.
          </Typography>
          <Button variant="contained" onClick={() => navigate("/board")}>
            Go to the board
          </Button>
          <Button onClick={() => navigate("/")}>Back home</Button>
        </Stack>
      </Centered>
    );
  }

  const current = state.session[state.index];

  return (
    <>
      {state.phase === "task" && current && (
        <ActiveTaskView
          task={current}
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
        title="End this session?"
        message="You can always start another one."
        confirmLabel="End session"
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
