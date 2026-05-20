import type { ReactNode } from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {
  AppBar,
  Box,
  Divider,
  IconButton,
  Toolbar,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router";

export function FaqScreen() {
  const navigate = useNavigate();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100dvh" }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate("/")}
            aria-label="Back"
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6">How it works</Typography>
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          flexGrow: 1,
          overflowY: "auto",
          p: 3,
          maxWidth: 720,
          mx: "auto",
          width: "100%",
        }}
      >
        <Section title="Adding tasks">
          <Typography sx={{ mb: 2 }} color="text.secondary">
            Tap the <strong>+</strong> on the Board, type a chunky task like
            "clean the kitchen" or "tidy the yard", then hit{" "}
            <strong>Break it down with AI</strong>. Claude returns 3–10 ordered steps,
            each ≤10 minutes. Tweak titles and estimates, flip the repeat icon on
            anything that should come back weekly, and tap{" "}
            <strong>Add to Ready</strong> — the steps land in the Ready lane in the
            order they should be done.
          </Typography>
          <Typography sx={{ mb: 1 }} color="text.secondary">
            Just need one task? Same screen, scroll down to{" "}
            <em>Or add just one task</em>.
          </Typography>
        </Section>

        <Divider />

        <Section title="Get Started flow">
          <Typography sx={{ mb: 2 }} color="text.secondary">
            From Home, tap <strong>Get Started</strong>, pick your work and break
            minutes, hit Start. The app picks a coherent batch of tasks from Ready —
            anchored to one area so you don't bounce between unrelated chores — and
            shows you <strong>one task at a time</strong>.
          </Typography>
          <Typography sx={{ mb: 2 }} color="text.secondary">
            A bar shrinks against the estimate: green → yellow → red → big{" "}
            <strong>OVERTIME!</strong> in red if you blow past it.{" "}
            <strong>Complete</strong> moves you to the next task. After a full work
            interval a break screen takes over for your break minutes. The Finish
            screen recaps what you did.
          </Typography>
          <Typography sx={{ mb: 1 }} color="text.secondary">
            Tasks walk in <strong>Ready-lane order</strong>, so "get supplies" → "do
            the thing" → "put it back" actually stays in that order. Drag tasks
            around in Ready any time to change the sequence.
          </Typography>
        </Section>

        <Divider />

        <Section title="The doombox">
          <Typography sx={{ mb: 2 }} color="text.secondary">
            A literal box, somewhere in your house. When you're cleaning a room and
            find something that doesn't belong there — a stray mug in the bedroom, a
            sock in the kitchen — you toss it in the <strong>doombox</strong>. You
            do <em>not</em> leave the room to put it away. Leaving the room is how
            ADHD cleaning sessions die.
          </Typography>
          <Typography sx={{ mb: 1 }} color="text.secondary">
            Once a week, you process the doombox:
          </Typography>
          <Box
            component="ol"
            sx={{
              pl: 3,
              mb: 2,
              color: "text.secondary",
              "& li": { mb: 0.75 },
            }}
          >
            <li>Dump it onto a flat surface.</li>
            <li>
              Sort into one pile per room the items belong in, plus a single{" "}
              <strong>DOOM</strong> pile for anything to throw out, recycle, or
              donate.
            </li>
            <li>Walk each pile to its room.</li>
            <li>Deal with the DOOM pile.</li>
          </Box>
          <Typography sx={{ mb: 1 }} color="text.secondary">
            The AI breakdown already knows about doomboxes — ask it to clean a room
            and you'll get a "put anything that doesn't belong here in the doombox"
            step instead of a focus-breaking "return items to their proper rooms."
            And typing <strong>"sort the doombox"</strong> as a task produces that
            weekly sort flow above.
          </Typography>
        </Section>
      </Box>
    </Box>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1.5 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}
