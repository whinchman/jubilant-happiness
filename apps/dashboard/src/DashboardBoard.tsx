import { Box, Chip, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import {
  fetchBoard,
  LANES,
  type ChoreWithSteps,
  type Lane,
} from "@todoer/shared";

const LABELS: Record<Lane, string> = {
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
            <DashColumn key={lane} title={LABELS[lane]} chores={data[lane]} />
          ))}
        </Box>
      )}
    </Box>
  );
}

function DashColumn({
  title,
  chores,
}: {
  title: string;
  chores: ChoreWithSteps[];
}) {
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
        {title} · {chores.length}
      </Typography>
      <Stack spacing={1.5} sx={{ overflowY: "auto", flexGrow: 1 }}>
        {chores.map((chore) => (
          <Box
            key={chore.id}
            sx={{ bgcolor: "rgba(255,255,255,0.05)", borderRadius: 2, p: 1.5 }}
          >
            <Typography sx={{ fontWeight: 600, fontSize: 18, mb: 0.75 }}>
              {chore.title}
            </Typography>
            <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
              <Chip label={`${chore.estimateMinutes} min`} size="small" />
              {chore.area && (
                <Chip
                  label={chore.area}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              )}
            </Box>
          </Box>
        ))}
        {chores.length === 0 && (
          <Typography sx={{ color: "text.disabled" }}>—</Typography>
        )}
      </Stack>
    </Paper>
  );
}
