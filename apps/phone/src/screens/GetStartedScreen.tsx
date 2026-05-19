import { useState } from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {
  AppBar,
  Box,
  Button,
  IconButton,
  Slider,
  Toolbar,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router";

export function GetStartedScreen() {
  const navigate = useNavigate();
  const [workMinutes, setWorkMinutes] = useState(20);
  const [breakMinutes, setBreakMinutes] = useState(5);

  return (
    <Box sx={{ height: "100dvh", display: "flex", flexDirection: "column" }}>
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
          <Typography variant="h6">Get Started</Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ flexGrow: 1, p: 3, display: "flex", flexDirection: "column", gap: 4 }}>
        <Typography color="text.secondary">
          Work in focused stretches with a break in between. Adjust to taste.
        </Typography>
        <Box>
          <Typography sx={{ fontWeight: 600, mb: 1 }}>
            Work for {workMinutes} min
          </Typography>
          <Slider
            value={workMinutes}
            onChange={(_, value) => setWorkMinutes(value as number)}
            min={5}
            max={60}
            step={5}
            valueLabelDisplay="auto"
          />
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 600, mb: 1 }}>
            Break for {breakMinutes} min
          </Typography>
          <Slider
            value={breakMinutes}
            onChange={(_, value) => setBreakMinutes(value as number)}
            min={1}
            max={20}
            step={1}
            valueLabelDisplay="auto"
          />
        </Box>
      </Box>

      <Box sx={{ p: 3 }}>
        <Button
          variant="contained"
          size="large"
          fullWidth
          onClick={() =>
            navigate("/focus", { state: { workMinutes, breakMinutes } })
          }
          sx={{ py: 1.8, fontSize: 18 }}
        >
          Start
        </Button>
      </Box>
    </Box>
  );
}
