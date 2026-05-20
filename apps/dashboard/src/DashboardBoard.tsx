import { Box, CircularProgress, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import {
  fetchBoard,
  LANES,
  type ChoreWithSteps,
  type Lane,
} from "@todoer/shared";
import {
  bg,
  bgCard,
  bgRecessed,
  blue,
  blueSoft,
  display,
  ink,
  inkDim,
  mono,
  pink,
  red,
  yellow,
} from "./theme";

const LABELS: Record<Lane, string> = {
  ready: "to_do",
  doing: "doing",
  done: "done!",
};

const LANE_COLORS: Record<Lane, string> = {
  ready: blue,
  doing: pink,
  done: yellow,
};

function stableTilt(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return (((h % 30) + 30) % 30) / 10 - 1.5;
}

export function DashboardBoard() {
  const board = useQuery({
    queryKey: ["board"],
    queryFn: fetchBoard,
    refetchInterval: 15000,
  });
  const data = board.data;
  const total = data ? data.ready.length + data.doing.length + data.done.length : 0;
  const refreshed = board.dataUpdatedAt
    ? new Date(board.dataUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "—";

  return (
    <Box
      sx={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Masthead */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          px: 4,
          py: 2,
          bgcolor: ink,
          color: bg,
        }}
      >
        <Typography
          sx={{
            fontFamily: display,
            fontWeight: 900,
            fontSize: 36,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          todo-er
          <Box component="span" sx={{ color: pink }}>!</Box>{" "}
          <Box
            component="span"
            sx={{
              fontFamily: mono,
              fontWeight: 500,
              fontSize: 18,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: yellow,
            }}
          >
            board · live
          </Box>
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Box
          sx={{
            bgcolor: pink,
            color: ink,
            border: `2px solid ${bg}`,
            px: 1.5,
            py: 0.75,
            fontFamily: mono,
            fontWeight: 500,
            fontSize: 14,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          {total} chores · refresh {refreshed}
        </Box>
      </Box>

      {/* Body */}
      <Box sx={{ flexGrow: 1, minHeight: 0, p: 3 }}>
        {board.isLoading && !data && (
          <Box sx={{ display: "grid", placeItems: "center", height: "100%" }}>
            <CircularProgress size={64} />
          </Box>
        )}
        {board.isError && !data && (
          <Box
            sx={{
              bgcolor: red,
              color: bg,
              border: `4px solid ${ink}`,
              p: 4,
              fontFamily: display,
              fontWeight: 800,
              fontSize: 28,
              textTransform: "uppercase",
            }}
          >
            couldn't load the board.
          </Box>
        )}
        {data && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 3,
              height: "100%",
            }}
          >
            {LANES.map((lane) => (
              <DashColumn
                key={lane}
                lane={lane}
                title={LABELS[lane]}
                chores={data[lane]}
              />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}

function DashColumn({
  lane,
  title,
  chores,
}: {
  lane: Lane;
  title: string;
  chores: ChoreWithSteps[];
}) {
  const color = LANE_COLORS[lane];
  return (
    <Box sx={{ minHeight: 0, display: "flex", flexDirection: "column" }}>
      {/* Sticker tab header */}
      <Box
        sx={{
          bgcolor: color,
          color: lane === "ready" ? bg : ink,
          border: `3px solid ${ink}`,
          borderBottom: "none",
          px: 2,
          py: 1.5,
          display: "flex",
          alignItems: "baseline",
          gap: 1.5,
          fontFamily: display,
          fontWeight: 900,
          fontSize: 36,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        <Box component="span">{title}</Box>
        <Box sx={{ flexGrow: 1, borderTop: `3px dashed ${ink}`, opacity: 0.5, mb: 1 }} />
        <Box
          component="span"
          sx={{
            fontFamily: mono,
            fontWeight: 500,
            fontSize: 18,
            letterSpacing: "0.06em",
          }}
        >
          ({String(chores.length).padStart(2, "0")})
        </Box>
      </Box>
      {/* Body */}
      <Box
        sx={{
          flexGrow: 1,
          minHeight: 0,
          border: `3px solid ${ink}`,
          bgcolor: bgRecessed,
          overflowY: "auto",
          p: 1.75,
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {chores.map((chore) => {
            const tilt = stableTilt(chore.id);
            const stepTotal = chore.steps.length;
            const stepDone = chore.steps.filter((s) => s.completedAt !== null).length;
            const isDone = lane === "done";
            return (
              <Box
                key={chore.id}
                sx={{
                  bgcolor: isDone ? bg : bgCard,
                  border: `3px solid ${ink}`,
                  boxShadow: `4px 4px 0 0 ${ink}`,
                  p: 1.75,
                  transform: `rotate(${tilt}deg)`,
                  opacity: isDone ? 0.65 : 1,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: display,
                    fontWeight: 800,
                    fontSize: 26,
                    lineHeight: 1.05,
                    textTransform: "uppercase",
                    letterSpacing: "-0.005em",
                    textDecoration: isDone ? "line-through" : "none",
                    mb: 1,
                  }}
                >
                  {chore.title}
                </Typography>
                <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", alignItems: "center" }}>
                  <DashBadge color="ink">{chore.estimateMinutes} min</DashBadge>
                  {chore.area && <DashBadge color="blue">{chore.area}</DashBadge>}
                  {stepTotal > 0 && (
                    <DashBadge color="pink">
                      {String(stepDone).padStart(2, "0")}/
                      {String(stepTotal).padStart(2, "0")} steps
                    </DashBadge>
                  )}
                </Box>
              </Box>
            );
          })}
          {chores.length === 0 && (
            <Box
              sx={{
                py: 6,
                border: `3px dashed ${ink}`,
                bgcolor: "transparent",
                opacity: 0.45,
                textAlign: "center",
                fontFamily: display,
                fontWeight: 700,
                fontSize: 22,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: inkDim,
              }}
            >
              empty
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

function DashBadge({
  children,
  color,
}: {
  children: React.ReactNode;
  color: "ink" | "pink" | "blue" | "yellow";
}) {
  const palette = {
    ink: { bg: ink, fg: bg, border: ink },
    pink: { bg: pink, fg: ink, border: ink },
    blue: { bg: blueSoft, fg: blue, border: blue },
    yellow: { bg: yellow, fg: ink, border: ink },
  }[color];
  return (
    <Box
      component="span"
      sx={{
        display: "inline-block",
        bgcolor: palette.bg,
        color: palette.fg,
        border: `2px solid ${palette.border}`,
        px: 0.75,
        py: 0.2,
        fontFamily: mono,
        fontWeight: 500,
        fontSize: 12,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </Box>
  );
}
