import { useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import HomeIcon from "@mui/icons-material/Home";
import {
  AppBar,
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
import {
  LANES,
  type Board,
  type ChoreWithSteps,
  type Lane as LaneId,
} from "@todoer/shared";
import { EditTaskDialog } from "../components/EditTaskDialog";
import { Lane } from "../components/Lane";
import { TaskCard } from "../components/TaskCard";
import { useBoard, useMoveTask } from "../lib/api-hooks";
import { computeMove, findChoreInBoard, findLane, isLane } from "../lib/board-dnd";

const LANE_LABELS: Record<LaneId, string> = {
  ready: "Ready",
  doing: "Doing",
  done: "Done",
};

export function BoardScreen() {
  const board = useBoard();
  const moveTask = useMoveTask();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [editingChore, setEditingChore] = useState<ChoreWithSteps | null>(null);
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
    const toLane: LaneId | null = isLane(overId)
      ? overId
      : findLane(current, overId);
    if (!toLane) return;

    const planned = computeMove(current, draggedId, fromLane, toLane, overId);
    if (!planned) return;
    qc.setQueryData(["board"], planned.board);
    moveTask.mutate({ id: draggedId, input: planned.input });
  }

  const boardData = board.data;
  const activeChore =
    activeId && boardData ? findChoreInBoard(boardData, activeId) : null;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100dvh" }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate("/")}
            aria-label="Home"
          >
            <HomeIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Board
          </Typography>
          <IconButton
            color="inherit"
            edge="end"
            onClick={() => navigate("/add")}
            aria-label="Add task"
          >
            <AddIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ flexGrow: 1, overflow: "hidden", p: 1 }}>
        {board.isLoading && (
          <Box sx={{ display: "grid", placeItems: "center", height: "100%" }}>
            <CircularProgress />
          </Box>
        )}
        {board.isError && (
          <Box sx={{ p: 2 }}>
            <Typography color="error">
              Couldn't load the board. Is the server running?
            </Typography>
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
              }}
            >
              {LANES.map((lane) => (
                <Lane
                  key={lane}
                  laneId={lane}
                  title={LANE_LABELS[lane]}
                  chores={boardData[lane]}
                  onChoreClick={setEditingChore}
                />
              ))}
            </Box>
            <DragOverlay>
              {activeChore ? (
                <Box sx={{ boxShadow: 6, borderRadius: 2 }}>
                  <TaskCard chore={activeChore} />
                </Box>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </Box>

      <EditTaskDialog task={editingChore} onClose={() => setEditingChore(null)} />
    </Box>
  );
}
