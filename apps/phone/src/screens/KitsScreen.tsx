import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {
  Box,
  IconButton,
  Toolbar,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router";
import { Sticker } from "../components/Chrome";
import { kitRoute, KITS, type KitEntry } from "../kits/registry";
import {
  bg,
  bgCard,
  blue,
  display,
  ink,
  inkDim,
  mono,
  pink,
  pinkSoft,
} from "../theme";

export function KitsScreen() {
  const navigate = useNavigate();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <Box sx={{ bgcolor: ink, color: bg }}>
        <Toolbar sx={{ minHeight: 56, px: 1 }}>
          <IconButton
            edge="start"
            onClick={() => navigate("/add")}
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
            chore_kits
            <Box component="span" sx={{ color: pink }}>.</Box>
          </Typography>
        </Toolbar>
      </Box>

      <Box sx={{ flexGrow: 1, overflowY: "auto", p: 3, maxWidth: 540, mx: "auto", width: "100%" }}>
        <Sticker color="yellow" rotate={-2}>
          guided
        </Sticker>
        <Typography
          sx={{
            fontFamily: display,
            fontWeight: 900,
            fontSize: 38,
            lineHeight: 0.95,
            textTransform: "uppercase",
            letterSpacing: "-0.01em",
            mt: 1.5,
            mb: 2,
            textShadow: `2px 2px 0 ${pink}, -2px -2px 0 ${blue}`,
          }}
        >
          pick a{" "}
          <Box component="span" sx={{ color: pink }}>
            kit.
          </Box>
        </Typography>

        {KITS.map((kit) => (
          <KitCard
            key={kit.id}
            kit={kit}
            onSelect={() => navigate(kitRoute(kit.id))}
          />
        ))}
      </Box>
    </Box>
  );
}

function KitCard({ kit, onSelect }: { kit: KitEntry; onSelect: () => void }) {
  const disabled = !kit.enabled;
  return (
    <Box
      onClick={disabled ? undefined : onSelect}
      role={disabled ? undefined : "button"}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) onSelect();
      }}
      sx={{
        bgcolor: bgCard,
        border: `2px solid ${ink}`,
        p: 1.5,
        mb: 1.25,
        display: "flex",
        gap: 1.5,
        alignItems: "center",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.45 : 1,
        "&:hover": disabled ? {} : { bgcolor: pinkSoft, color: ink },
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          bgcolor: ink,
          color: bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: display,
          fontWeight: 900,
          fontSize: 22,
          flexShrink: 0,
        }}
      >
        {kit.icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontFamily: display,
            fontWeight: 900,
            fontSize: 22,
            textTransform: "uppercase",
            letterSpacing: "0.02em",
            lineHeight: 1,
          }}
        >
          {kit.title}
        </Typography>
        <Typography
          sx={{
            fontFamily: mono,
            fontSize: 11,
            color: inkDim,
            mt: 0.5,
            letterSpacing: "0.02em",
          }}
        >
          {kit.blurb}
        </Typography>
      </Box>
      {disabled ? (
        <Typography
          sx={{
            fontFamily: mono,
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: inkDim,
          }}
        >
          soon
        </Typography>
      ) : (
        <Box
          component="span"
          sx={{ fontFamily: display, fontWeight: 900, fontSize: 26, color: pink }}
        >
          →
        </Box>
      )}
    </Box>
  );
}
