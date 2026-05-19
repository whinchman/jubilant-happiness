import { Box, Chip, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { fetchBoard, LANES, type Lane, type Task } from "@todoer/shared";

const LABELS: Record<Lane, string> = {
  backlog: "Backlog",
  ready: "Ready",
  doing: "Doing",
  done: "Done",
};

export function DashboardBoard() {
  const board = useQuery({
    queryKey: ["board"],
    queryFn: fetchBoard,
    refetchInterval: 15000,
  });
  const data = board.data;

  return (
    <Box sx={{ height: "100dvh", display: "flex", flexDirection: "column", p: 4 }}>
      <Typography variant="h3" sx={{ fontWeight: 800, mb: 3 }}>
        TODO-ER
      </Typography>
      {board.isLoading && !data && <CircularProgress />}
      {board.isError && !data && (
        <Typography color="error">Couldn't load the board.</Typography>
      )}
      {data && (
        <Box sx={{ flexGrow: 1, display: "flex", gap: 3, minHeight: 0 }}>
          {LANES.map((lane) => (
            <DashColumn key={lane} title={LABELS[lane]} tasks={data[lane]} />
          ))}
        </Box>
      )}
    </Box>
  );
}

function DashColumn({ title, tasks }: { title: string; tasks: Task[] }) {
  return (
    <Paper
      sx={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        p: 2,
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: "text.secondary" }}>
        {title} · {tasks.length}
      </Typography>
      <Stack spacing={1.5} sx={{ overflowY: "auto", flexGrow: 1 }}>
        {tasks.map((task) => (
          <Box
            key={task.id}
            sx={{ bgcolor: "rgba(255,255,255,0.05)", borderRadius: 2, p: 1.5 }}
          >
            <Typography sx={{ fontWeight: 600, fontSize: 18, mb: 0.75 }}>
              {task.title}
            </Typography>
            <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
              <Chip label={`${task.estimateMinutes} min`} size="small" />
              {task.area && (
                <Chip
                  label={task.area}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              )}
            </Box>
          </Box>
        ))}
        {tasks.length === 0 && (
          <Typography sx={{ color: "text.disabled" }}>—</Typography>
        )}
      </Stack>
    </Paper>
  );
}
