import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Box, Paper, Stack, Typography } from "@mui/material";
import type { ChoreWithSteps, Lane as LaneId } from "@todoer/shared";
import { SortableTaskCard } from "./SortableTaskCard";

interface LaneProps {
  laneId: LaneId;
  title: string;
  chores: ChoreWithSteps[];
  onChoreClick: (chore: ChoreWithSteps) => void;
}

export function Lane({ laneId, title, chores, onChoreClick }: LaneProps) {
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
        {title} · {chores.length}
      </Typography>
      <SortableContext
        items={chores.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <Stack
          spacing={1}
          sx={{ px: 1, pb: 1, flexGrow: 1, overflowY: "auto", minHeight: 80 }}
        >
          {chores.map((chore) => (
            <SortableTaskCard
              key={chore.id}
              chore={chore}
              onClick={() => onChoreClick(chore)}
            />
          ))}
          {chores.length === 0 && (
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
