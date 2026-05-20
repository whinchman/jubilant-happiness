import { useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import HomeIcon from "@mui/icons-material/Home";
import {
  Box,
  CircularProgress,
  IconButton,
  Toolbar,
  Typography,
} from "@mui/material";
import {
  pointerWithin,
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { LANES, type Board, type Lane as LaneId } from "@todoer/shared";
import { EditTaskDialog } from "../components/EditTaskDialog";
import { Lane } from "../components/Lane";
import { TaskCard } from "../components/TaskCard";
import { useBoard, useMoveTask } from "../lib/api-hooks";
import { computeMove, findChoreInBoard, findLane, isLane } from "../lib/board-dnd";
import { bg, display, ink, pink, red } from "../theme";
import { StampFooter, isoStamp } from "../components/Chrome";

const LANE_LABELS: Record<LaneId, string> = {
  ready: "to_do",
  doing: "doing",
  done: "done!",
};

export function BoardScreen() {
  const board = useBoard();
  const moveTask = useMoveTask();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [editingChoreId, setEditingChoreId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const draggedId = String(active.id);
    const overId = String(over.id);
    if (draggedId === overId) return;

    const current = qc.getQueryData<Board>(["board"]);
    if (!current) return;
    const fromLane = findLane(current, draggedId);
    if (!fromLane) return;
    const toLane: LaneId | null = isLane(overId) ? overId : findLane(current, overId);
    if (!toLane) return;

    const planned = computeMove(current, draggedId, fromLane, toLane, overId);
    if (!planned) return;
    qc.setQueryData(["board"], planned.board);
    moveTask.mutate({ id: draggedId, input: planned.input });
  }

  const boardData = board.data;
  const activeChore = activeId && boardData ? findChoreInBoard(boardData, activeId) : null;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100dvh" }}>
      {/* Black masthead */}
      <Box sx={{ bgcolor: ink, color: bg }}>
        <Toolbar sx={{ minHeight: 56, px: 1 }}>
          <IconButton
            edge="start"
            onClick={() => navigate("/")}
            aria-label="Home"
            sx={{ color: bg, "&:hover": { color: pink } }}
          >
            <HomeIcon />
          </IconButton>
          <Typography
            sx={{
              fontFamily: display,
              fontWeight: 900,
              fontSize: 22,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              ml: 0.5,
            }}
          >
            the_pile
            <Box component="span" sx={{ color: pink }}>
              .
            </Box>
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton
            edge="end"
            onClick={() => navigate("/add")}
            aria-label="Add task"
            sx={{
              color: ink,
              bgcolor: pink,
              border: `2px solid ${bg}`,
              borderRadius: 0,
              width: 38,
              height: 38,
              "&:hover": { color: ink, bgcolor: pink, transform: "translate(-1px, -1px)" },
            }}
          >
            <AddIcon />
          </IconButton>
        </Toolbar>
      </Box>

      <Box
        sx={{
          flexGrow: 1,
          overflow: "hidden",
          p: 1.25,
          minHeight: 0,
        }}
      >
        {board.isLoading && (
          <Box sx={{ display: "grid", placeItems: "center", height: "100%" }}>
            <CircularProgress />
          </Box>
        )}
        {board.isError && (
          <Box
            sx={{
              border: `2px solid ${ink}`,
              p: 3,
              m: 2,
              bgcolor: red,
              color: bg,
              fontFamily: display,
              fontWeight: 700,
              fontSize: 16,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            couldn't load the board — is the server up?
          </Box>
        )}
        {boardData && (
          <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveId(null)}
          >
            <Box
              sx={{
                display: "flex",
                gap: 1.5,
                height: "100%",
                justifyContent: "safe center",
                overflowX: "auto",
                overflowY: "hidden",
                pb: 1,
                px: 0.5,
              }}
            >
              {LANES.map((lane) => (
                <Lane
                  key={lane}
                  laneId={lane}
                  title={LANE_LABELS[lane]}
                  chores={boardData[lane]}
                  onChoreClick={(c) => setEditingChoreId(c.id)}
                />
              ))}
            </Box>
            <DragOverlay dropAnimation={null}>
              {activeChore ? (
                <Box sx={{ transform: "rotate(-3deg)" }}>
                  <TaskCard chore={activeChore} flat />
                </Box>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </Box>

      <StampFooter
        left={
          boardData
            ? `${countTotal(boardData)} chores · ${countDoing(boardData)} in flight`
            : "loading"
        }
        right={isoStamp()}
      />

      <EditTaskDialog
        choreId={editingChoreId}
        onClose={() => setEditingChoreId(null)}
      />
    </Box>
  );
}

function countTotal(b: Board): number {
  return b.ready.length + b.doing.length + b.done.length;
}
function countDoing(b: Board): number {
  return b.doing.length;
}
