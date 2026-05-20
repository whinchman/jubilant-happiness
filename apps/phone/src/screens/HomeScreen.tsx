import { Box, Button, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router";
import { APP_NAME } from "@todoer/shared";
import {
  Arrow,
  OffsetHeadline,
  StampFooter,
  Sticker,
  TornRule,
  dayOfYearLabel,
  isoStamp,
} from "../components/Chrome";
import { useLogout } from "../lib/api-hooks";
import { bg, blue, display, ink, inkDim, mono, pink, yellow } from "../theme";

export function HomeScreen() {
  const navigate = useNavigate();
  const logout = useLogout();

  return (
    <Box sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      {/* Masthead — solid black bar with title + version sticker */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 2.5,
          py: 1.5,
          bgcolor: ink,
          color: bg,
          borderBottom: `3px solid ${ink}`,
        }}
      >
        <Typography
          sx={{
            fontFamily: display,
            fontWeight: 900,
            fontSize: 24,
            letterSpacing: "0.02em",
            textTransform: "uppercase",
          }}
        >
          {APP_NAME}
          <Box component="span" sx={{ color: pink }}>
            !
          </Box>
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Box sx={{ transform: "translateY(-2px)" }}>
          <Sticker color="yellow" rotate={3} size="sm">
            v.001
          </Sticker>
        </Box>
      </Box>

      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          px: 3,
          py: 4,
          maxWidth: 460,
          mx: "auto",
          width: "100%",
          position: "relative",
        }}
      >
        {/* Floating sticker */}
        <Box
          sx={{
            position: "absolute",
            top: 16,
            right: 24,
            transform: "rotate(4deg)",
          }}
        >
          <Sticker color="pink" rotate={0}>
            {dayOfYearLabel()} · FUCK ICE
          </Sticker>
        </Box>

        {/* SCREAMING headline */}
        <Box sx={{ mt: 5, mb: 1 }}>
          <Box sx={{ display: "block" }}>
            <OffsetHeadline size={92}>One</OffsetHeadline>
          </Box>
          <Box sx={{ display: "block", ml: 1 }}>
            <OffsetHeadline size={92} color={pink} italic>
              small
            </OffsetHeadline>
          </Box>
          <Box sx={{ display: "block" }}>
            <OffsetHeadline size={92}>
              thing
              <Box component="span" sx={{ color: blue, textShadow: "none" }}>
                .
              </Box>
            </OffsetHeadline>
          </Box>
        </Box>

        <Stack spacing={2}>
          {/* Primary punk-block CTA */}
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate("/get-started")}
            sx={{
              justifyContent: "space-between",
              py: 2.5,
              fontSize: 22,
              letterSpacing: "0.04em",
              "& .label": { display: "flex", alignItems: "baseline", gap: 1 },
            }}
          >
            <Box component="span" className="label">
              Get
              <Box component="span" sx={{ color: pink }}>
                Started
              </Box>
            </Box>
            <Box
              component="span"
              sx={{
                fontFamily: display,
                fontWeight: 900,
                fontSize: 28,
                color: yellow,
              }}
            >
              →
            </Box>
          </Button>

          {/* Secondary actions as arrowed text links */}
          <Stack spacing={1.5} sx={{ pl: 0.5 }}>
            <ArrowLink onClick={() => navigate("/board")} label="open_the_board" />
            <ArrowLink onClick={() => navigate("/faq")} label="how_it_works" />
          </Stack>
        </Stack>

        <TornRule mt={1} />

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Typography
            sx={{
              fontFamily: mono,
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: inkDim,
              flexGrow: 1,
            }}
          >
            signed in
          </Typography>
          <Button
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            variant="text"
            sx={{
              fontFamily: mono,
              fontWeight: 500,
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: ink,
              p: 0,
              minWidth: 0,
              textDecorationThickness: 2,
            }}
          >
            {logout.isPending ? "…" : "log out"}
          </Button>
        </Box>
      </Box>

      <StampFooter left="executive disfunction? more like executive this function" right={isoStamp()} />
    </Box>
  );
}

function ArrowLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Box
      component="button"
      onClick={onClick}
      sx={{
        all: "unset",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 0,
        py: 1,
        fontFamily: display,
        fontWeight: 800,
        fontSize: 24,
        textTransform: "uppercase",
        letterSpacing: "0.02em",
        color: ink,
        transition: "color 100ms ease, transform 100ms ease",
        "&:hover": { color: pink, transform: "translateX(4px)" },
        "&:focus-visible": {
          outline: `2px solid ${pink}`,
          outlineOffset: 2,
        },
      }}
    >
      <Arrow />
      {label}
    </Box>
  );
}
