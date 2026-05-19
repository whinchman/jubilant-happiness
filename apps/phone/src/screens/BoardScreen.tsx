import { useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import {
  AppBar,
  Box,
  CircularProgress,
  IconButton,
  Toolbar,
  Typography,
} from "@mui/material";
import { LANES, type Lane as LaneId } from "@todoer/shared";
import { AddTaskDialog } from "../components/AddTaskDialog";
import { Lane } from "../components/Lane";
import { useBoard } from "../lib/api-hooks";

const LANE_LABELS: Record<LaneId, string> = {
  backlog: "Backlog",
  ready: "Ready",
  doing: "Doing",
  done: "Done",
};

export function BoardScreen() {
  const board = useBoard();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100dvh" }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Board
          </Typography>
          <IconButton
            color="inherit"
            edge="end"
            onClick={() => setAddOpen(true)}
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
        {board.data && (
          <Box
            sx={{
              display: "flex",
              gap: 1.5,
              height: "100%",
              overflowX: "auto",
              overflowY: "hidden",
              pb: 1,
            }}
          >
            {LANES.map((lane) => (
              <Lane key={lane} title={LANE_LABELS[lane]} tasks={board.data[lane]} />
            ))}
          </Box>
        )}
      </Box>

      <AddTaskDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </Box>
  );
}
