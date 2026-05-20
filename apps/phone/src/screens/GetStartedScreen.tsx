import { useState } from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {
  Box,
  Button,
  IconButton,
  Slider,
  Toolbar,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router";
import { Sticker } from "../components/Chrome";
import {
  bg,
  blue,
  display,
  ink,
  inkDim,
  mono,
  pink,
  yellow,
} from "../theme";

export function GetStartedScreen() {
  const navigate = useNavigate();
  const [workMinutes, setWorkMinutes] = useState(20);
  const [breakMinutes, setBreakMinutes] = useState(5);

  return (
    <Box sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
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
            get_started
            <Box component="span" sx={{ color: pink }}>.</Box>
          </Typography>
        </Toolbar>
      </Box>

      <Box
        sx={{
          flexGrow: 1,
          p: 3,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          maxWidth: 480,
          mx: "auto",
          width: "100%",
        }}
      >
        <Box>
          <Sticker color="yellow" rotate={-2}>
            ready when you are
          </Sticker>
          <Typography
            sx={{
              fontFamily: display,
              fontWeight: 900,
              fontSize: 44,
              lineHeight: 0.95,
              textTransform: "uppercase",
              letterSpacing: "-0.01em",
              mt: 1.5,
              textShadow: `2px 2px 0 ${pink}, -2px -2px 0 ${blue}`,
            }}
          >
            pick your{" "}
            <Box component="span" sx={{ color: pink }}>
              pace.
            </Box>
          </Typography>
          <Typography
            sx={{
              fontFamily: mono,
              fontSize: 13,
              lineHeight: 1.5,
              color: inkDim,
              mt: 1.5,
            }}
          >
            work in focused stretches, with a break in between. adjust to taste.
          </Typography>
        </Box>

        <SliderBlock
          label="work for"
          value={workMinutes}
          unit="min"
          onChange={setWorkMinutes}
          min={5}
          max={60}
          step={5}
          color={pink}
        />
        <SliderBlock
          label="break for"
          value={breakMinutes}
          unit="min"
          onChange={setBreakMinutes}
          min={1}
          max={20}
          step={1}
          color={blue}
        />
      </Box>

      <Box sx={{ p: 3 }}>
        <Button
          variant="contained"
          size="large"
          fullWidth
          onClick={() =>
            navigate("/focus", { state: { workMinutes, breakMinutes } })
          }
          sx={{
            py: 2.5,
            fontSize: 24,
            justifyContent: "space-between",
          }}
        >
          <Box component="span">start →</Box>
          <Box
            component="span"
            sx={{
              fontFamily: display,
              fontWeight: 900,
              fontSize: 22,
              color: yellow,
              letterSpacing: "0.06em",
            }}
          >
            {workMinutes}·{breakMinutes}
          </Box>
        </Button>
      </Box>
    </Box>
  );
}

function SliderBlock({
  label,
  value,
  unit,
  onChange,
  min,
  max,
  step,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  color: string;
}) {
  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, mb: 1 }}>
        <Typography
          sx={{
            fontFamily: mono,
            fontWeight: 500,
            fontSize: 12,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: inkDim,
          }}
        >
          {label}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Typography
          sx={{
            fontFamily: display,
            fontWeight: 900,
            fontSize: 36,
            lineHeight: 1,
            color: ink,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </Typography>
        <Typography
          sx={{
            fontFamily: mono,
            fontWeight: 500,
            fontSize: 12,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: inkDim,
            pb: 0.5,
          }}
        >
          {unit}
        </Typography>
      </Box>
      <Slider
        value={value}
        onChange={(_, v) => onChange(v as number)}
        min={min}
        max={max}
        step={step}
        sx={{
          color,
          "& .MuiSlider-track": { backgroundColor: color },
          "& .MuiSlider-thumb": { backgroundColor: color },
        }}
      />
    </Box>
  );
}
