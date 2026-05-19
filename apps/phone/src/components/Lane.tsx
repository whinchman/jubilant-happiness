import { Box, Paper, Stack, Typography } from "@mui/material";
import type { Task } from "@todoer/shared";
import { TaskCard } from "./TaskCard";

interface LaneProps {
  title: string;
  tasks: Task[];
}

export function Lane({ title, tasks }: LaneProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        width: 280,
        minWidth: 280,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "rgba(0,0,0,0.04)",
        borderRadius: 3,
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{ px: 2, py: 1.5, fontWeight: 700, color: "text.secondary" }}
      >
        {title} · {tasks.length}
      </Typography>
      <Stack spacing={1} sx={{ px: 1, pb: 1, flexGrow: 1, overflowY: "auto" }}>
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
        {tasks.length === 0 && (
          <Box sx={{ p: 2, textAlign: "center", color: "text.disabled", fontSize: 14 }}>
            Nothing here yet
          </Box>
        )}
      </Stack>
    </Paper>
  );
}
