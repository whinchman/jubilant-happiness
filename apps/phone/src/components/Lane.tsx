import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Box, Stack, Typography } from "@mui/material";
import type { ChoreWithSteps, Lane as LaneId } from "@todoer/shared";
import { SortableTaskCard } from "./SortableTaskCard";
import {
  bg,
  bgRecessed,
  blue,
  display,
  ink,
  inkDim,
  mono,
  pink,
  yellow,
} from "../theme";

const LANE_COLORS: Record<LaneId, { tab: string; tabFg: string; body: string }> = {
  ready: { tab: blue, tabFg: bg, body: bgRecessed },
  doing: { tab: pink, tabFg: ink, body: bgRecessed },
  done: { tab: yellow, tabFg: ink, body: bgRecessed },
};

interface LaneProps {
  laneId: LaneId;
  title: string;
  chores: ChoreWithSteps[];
  onChoreClick: (chore: ChoreWithSteps) => void;
}

export function Lane({ laneId, title, chores, onChoreClick }: LaneProps) {
  const { setNodeRef, isOver } = useDroppable({ id: laneId });
  const palette = LANE_COLORS[laneId];

  return (
    <Box
      sx={{
        width: 290,
        minWidth: 290,
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Sticker tab header */}
      <Box
        sx={{
          bgcolor: palette.tab,
          color: palette.tabFg,
          border: `2px solid ${ink}`,
          borderBottom: "none",
          px: 1.5,
          py: 1,
          display: "flex",
          alignItems: "baseline",
          gap: 1,
          fontFamily: display,
          fontWeight: 800,
          fontSize: 22,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        <Box component="span">{title}</Box>
        <Box sx={{ flexGrow: 1, borderBottom: `2px dashed ${ink}`, opacity: 0.5 }} />
        <Box
          component="span"
          sx={{
            fontFamily: mono,
            fontWeight: 500,
            fontSize: 12,
            letterSpacing: "0.08em",
            ml: 0.5,
          }}
        >
          ({String(chores.length).padStart(2, "0")})
        </Box>
      </Box>

      {/* Body */}
      <Box
        ref={setNodeRef}
        sx={{
          flexGrow: 1,
          border: `2px solid ${ink}`,
          bgcolor: isOver ? yellow : palette.body,
          transition: "background-color 100ms ease",
          overflowY: "auto",
          overflowX: "visible",
          p: 1.25,
          minHeight: 100,
        }}
      >
        <SortableContext
          items={chores.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <Stack spacing={1.5}>
            {chores.map((chore) => (
              <SortableTaskCard
                key={chore.id}
                chore={chore}
                lane={laneId}
                onClick={() => onChoreClick(chore)}
              />
            ))}
            {chores.length === 0 && (
              <Box
                sx={{
                  py: 5,
                  textAlign: "center",
                  border: `2px dashed ${ink}`,
                  opacity: 0.45,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: display,
                    fontWeight: 700,
                    fontSize: 16,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: inkDim,
                  }}
                >
                  empty
                </Typography>
              </Box>
            )}
          </Stack>
        </SortableContext>
      </Box>
    </Box>
  );
}
