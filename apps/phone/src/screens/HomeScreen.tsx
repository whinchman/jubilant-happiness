import { Box, Button, Typography } from "@mui/material";
import { useNavigate } from "react-router";
import { APP_NAME } from "@todoer/shared";
import { useLogout } from "../lib/api-hooks";

export function HomeScreen() {
  const navigate = useNavigate();
  const logout = useLogout();

  return (
    <Box
      sx={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 2,
        p: 4,
      }}
    >
      <Typography variant="h3" sx={{ fontWeight: 800 }}>
        {APP_NAME}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        One small thing at a time.
      </Typography>
      <Button
        variant="contained"
        size="large"
        onClick={() => navigate("/get-started")}
        sx={{ py: 2.2, fontSize: 20, width: "100%", maxWidth: 340 }}
      >
        Get Started
      </Button>
      <Button
        variant="outlined"
        size="large"
        onClick={() => navigate("/board")}
        sx={{ py: 1.4, width: "100%", maxWidth: 340 }}
      >
        Board
      </Button>
      <Button
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
        sx={{ color: "text.secondary", mt: 3 }}
      >
        Log out
      </Button>
    </Box>
  );
}
