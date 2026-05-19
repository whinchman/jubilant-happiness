import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Box, Paper, Stack, Typography } from "@mui/material";
import type { Lane as LaneId, Task } from "@todoer/shared";
import { SortableTaskCard } from "./SortableTaskCard";

interface LaneProps {
  laneId: LaneId;
  title: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export function Lane({ laneId, title, tasks, onTaskClick }: LaneProps) {
  const { setNodeRef, isOver } = useDroppable({ id: laneId });

  return (
    <Paper
      ref={setNodeRef}
      elevation={0}
      sx={{
        width: 280,
        minWidth: 280,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: isOver ? "rgba(103,80,164,0.14)" : "rgba(0,0,0,0.04)",
        borderRadius: 3,
        transition: "background-color 120ms ease",
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{ px: 2, py: 1.5, fontWeight: 700, color: "text.secondary" }}
      >
        {title} · {tasks.length}
      </Typography>
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <Stack
          spacing={1}
          sx={{ px: 1, pb: 1, flexGrow: 1, overflowY: "auto", minHeight: 80 }}
        >
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
            />
          ))}
          {tasks.length === 0 && (
            <Box
              sx={{
                p: 2,
                textAlign: "center",
                color: "text.disabled",
                fontSize: 14,
              }}
            >
              Nothing here yet
            </Box>
          )}
        </Stack>
      </SortableContext>
    </Paper>
  );
}
