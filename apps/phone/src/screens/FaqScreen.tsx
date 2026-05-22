import type { ReactNode } from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Box, IconButton, Toolbar, Typography } from "@mui/material";
import { useNavigate } from "react-router";
import { Sticker, TornRule, StampFooter, isoStamp } from "../components/Chrome";
import {
  bg,
  blue,
  bgCard,
  display,
  ink,
  inkDim,
  mono,
  pink,
  yellow,
} from "../theme";

export function FaqScreen() {
  const navigate = useNavigate();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <Box sx={{ bgcolor: ink, color: bg }}>
        <Toolbar sx={{ minHeight: 56, px: 1 }}>
          <IconButton
            edge="start"
            onClick={() => navigate("/")}
            aria-label="Back"
            sx={{ color: bg, "&:hover": { color: pink } }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography
            sx={{
              fontFamily: display,
              fontWeight: 900,
              fontSize: 22,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            how_it_works
            <Box component="span" sx={{ color: pink }}>.</Box>
          </Typography>
        </Toolbar>
      </Box>

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
        <Box sx={{ mb: 4 }}>
          <Sticker color="yellow" rotate={-2}>
            field manual
          </Sticker>
          <Typography
            sx={{
              fontFamily: display,
              fontWeight: 900,
              fontSize: { xs: 48, sm: 64 },
              lineHeight: 0.95,
              textTransform: "uppercase",
              letterSpacing: "-0.01em",
              mt: 1.5,
              textShadow: `3px 3px 0 ${pink}, -3px -3px 0 ${blue}`,
            }}
          >
            the{" "}
            <Box component="span" sx={{ color: pink }}>
              manual.
            </Box>
          </Typography>
          <Typography
            sx={{
              fontFamily: mono,
              fontSize: 13,
              lineHeight: 1.6,
              color: inkDim,
              mt: 1.5,
            }}
          >
            what every button does, and why you should use the doombox.
          </Typography>
        </Box>

        <Section number="01" sticker="add chores" stickerColor="pink" title="Adding chores">
          <P>
            tap the <Strong>＋</Strong> on the board, type a chunky task like "clean the
            kitchen" or "tidy the yard", then hit{" "}
            <Strong>break it down with ai</Strong>. claude returns 3–25 ordered steps,
            each ≤10 minutes. tweak titles and estimates, flip the repeat switch on
            anything that should come back weekly, and hit <Strong>add chore</Strong> —
            the chore lands in to_do with the steps in execution order.
          </P>
          <P>
            just need one task? same screen, scroll down to{" "}
            <em>or just one</em>.
          </P>
        </Section>

        <TornRule mt={3} mb={3} />

        <Section number="02" sticker="get started flow" stickerColor="blue" title="Get Started flow">
          <P>
            from home, tap <Strong>get started</Strong>, pick your work and break
            minutes, hit start. the app picks a coherent batch of chores from to_do —
            anchored to one area so you don't bounce between unrelated chores — and
            shows you <Strong>one step at a time</Strong>.
          </P>
          <P>
            a bar shrinks against the estimate: pink filling, ticked into ten chunks. if
            you blow past it, you get a giant <Strong>OVERTIME!</Strong> stamp.{" "}
            <Strong>complete</Strong> moves you to the next task. after a full work
            interval a pink break screen takes over for your break minutes. the finish
            screen recaps what you did.
          </P>
          <P>
            steps walk in <Strong>position order</Strong>, so "get supplies" → "do the
            thing" → "put it back" actually stays in that order. reorder steps inside a
            chore from its edit dialog, or drag whole chores around in to_do any time to
            change which one comes up first.
          </P>
        </Section>

        <TornRule mt={3} mb={3} />

        <Section number="03" sticker="chore kits" stickerColor="pink" title="Chore kits">
          <P>
            sometimes the open-ended ai breakdown is the wrong tool. on the add
            screen, tap <Strong>use a chore kit</Strong> for a structured form
            tuned to a recurring shape of task. two kits today:
          </P>
          <P>
            <Strong>packing</Strong> — a trip becomes a packing list. tell it
            where you're going, how many nights, who's coming, the weather. you
            get back 5–10 grouped chunks (documents, clothes, toiletries…) with
            the actual items as notes on each step. the chore lives under an
            auto-built area like <em>"portland - trip"</em> so all your
            trip-prep stuff hangs together.
          </P>
          <P>
            <Strong>mega chore</Strong> — one huge thing that's really a
            project. <em>"clean the garage."</em> <em>"build a tick moat."</em>{" "}
            describe it and claude asks a few clarifying questions, then splits
            it into 2–10 ordered chores under a shared <em>mega-chore</em>.
            each chore is its own card on the board; chores in later groups
            sit below a <Strong>blocked</Strong> divider in to_do until the
            previous group is done. finish all the "dig section" chores and
            "lay gravel" auto-unblocks. if claude won't stop asking, hit{" "}
            <Strong>just give me the breakdown</Strong> and it ships what it
            has.
          </P>
          <P>
            also: when you type a kit-shaped task into the regular ai
            breakdown (<em>"pack for paris"</em>, <em>"redo the closet"</em>),
            it'll nudge you over to the matching kit instead of trying to fit
            it into one chore.
          </P>
        </Section>

        <TornRule mt={3} mb={3} />

        <Section number="04" sticker="the doombox" stickerColor="yellow" title="The doombox">
          <P>
            a literal box, somewhere in your house. when you're cleaning a room and
            find something that doesn't belong — a stray mug in the bedroom, a sock in
            the kitchen — you toss it in the <Strong>doombox</Strong>. you do{" "}
            <em>not</em> leave the room to put it away. leaving the room is how adhd
            cleaning sessions die.
          </P>
          <P>once a week, you process the doombox:</P>
          <Box
            component="ol"
            sx={{
              listStyle: "none",
              counterReset: "doom",
              pl: 0,
              mb: 2,
              "& li": {
                counterIncrement: "doom",
                pl: 4.5,
                py: 0.5,
                position: "relative",
                fontFamily: mono,
                fontSize: 13,
                lineHeight: 1.5,
                color: ink,
                "&::before": {
                  content: 'counter(doom, decimal-leading-zero) "."',
                  position: "absolute",
                  left: 0,
                  top: 4,
                  fontFamily: display,
                  fontWeight: 900,
                  fontSize: 18,
                  color: pink,
                },
              },
            }}
          >
            <li>dump it onto a flat surface.</li>
            <li>
              sort into one pile per room the items belong in, plus a single{" "}
              <Strong>DOOM</Strong> pile for anything to throw out, recycle, or donate.
            </li>
            <li>walk each pile to its room.</li>
            <li>deal with the DOOM pile.</li>
          </Box>
          <P>
            the ai breakdown already knows about doomboxes — ask it to clean a room and
            you'll get a "put anything that doesn't belong here in the doombox" step
            instead of a focus-breaking "return items to their proper rooms." and
            typing <Strong>"sort the doombox"</Strong> as a task produces that weekly
            sort flow above.
          </P>
        </Section>
      </Box>

      <StampFooter left="welcome to the workshop" right={isoStamp()} />
    </Box>
  );
}

function Section({
  number,
  sticker,
  stickerColor,
  title,
  children,
}: {
  number: string;
  sticker: string;
  stickerColor: "pink" | "blue" | "yellow";
  title: string;
  children: ReactNode;
}) {
  return (
    <Box sx={{ py: 2 }}>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1.5, mb: 1 }}>
        <Box
          sx={{
            fontFamily: display,
            fontWeight: 900,
            fontSize: 36,
            color: ink,
            bgcolor: yellow,
            border: `2px solid ${ink}`,
            px: 1,
            lineHeight: 1.1,
          }}
        >
          {number}
        </Box>
        <Sticker color={stickerColor} rotate={-3} size="sm">
          {sticker}
        </Sticker>
      </Box>
      <Typography
        sx={{
          fontFamily: display,
          fontWeight: 800,
          fontSize: { xs: 28, sm: 36 },
          textTransform: "uppercase",
          letterSpacing: "-0.005em",
          lineHeight: 1,
          mb: 2,
        }}
      >
        {title}
        <Box component="span" sx={{ color: pink }}>.</Box>
      </Typography>
      <Box sx={{ pl: { xs: 0, sm: 0.5 } }}>{children}</Box>
    </Box>
  );
}

function P({ children }: { children: ReactNode }) {
  return (
    <Typography
      sx={{
        fontFamily: mono,
        fontSize: 13,
        lineHeight: 1.65,
        color: ink,
        mb: 2,
      }}
    >
      {children}
    </Typography>
  );
}

function Strong({ children }: { children: ReactNode }) {
  return (
    <Box
      component="strong"
      sx={{
        fontFamily: mono,
        fontWeight: 600,
        color: ink,
        bgcolor: bgCard,
        borderBottom: `2px solid ${pink}`,
        px: 0.25,
      }}
    >
      {children}
    </Box>
  );
}
