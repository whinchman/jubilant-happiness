import type { ReactNode } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { fetchAuthStatus } from "@todoer/shared";
import { DashboardBoard } from "./DashboardBoard";
import { DashboardLogin } from "./DashboardLogin";
import { blue, display, ink, mono, pink } from "./theme";

export function App() {
  const status = useQuery({ queryKey: ["authStatus"], queryFn: fetchAuthStatus });

  if (status.isLoading) {
    return (
      <Center>
        <CircularProgress />
      </Center>
    );
  }
  if (status.isError || !status.data) {
    return (
      <Center>
        <Banner color="error">
          <BigLine>no signal.</BigLine>
          <SmallLine>can't reach the server.</SmallLine>
        </Banner>
      </Center>
    );
  }
  if (status.data.needsSetup) {
    return (
      <Center>
        <Banner color="info">
          <BigLine>set up first.</BigLine>
          <SmallLine>open the app on your phone to create an account.</SmallLine>
        </Banner>
      </Center>
    );
  }
  if (!status.data.authenticated) {
    return <DashboardLogin />;
  }
  return <DashboardBoard />;
}

function Center({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ height: "100dvh", display: "grid", placeItems: "center", p: 4 }}>
      {children}
    </Box>
  );
}

function Banner({ children, color }: { children: ReactNode; color: "error" | "info" }) {
  return (
    <Box
      sx={{
        bgcolor: color === "error" ? "#ff2c2c" : "#ffe029",
        color: ink,
        border: `4px solid ${ink}`,
        boxShadow: `12px 12px 0 0 ${ink}`,
        px: 6,
        py: 5,
        textAlign: "center",
        transform: "rotate(-1.5deg)",
        maxWidth: 720,
      }}
    >
      {children}
    </Box>
  );
}

function BigLine({ children }: { children: ReactNode }) {
  return (
    <Typography
      sx={{
        fontFamily: display,
        fontWeight: 900,
        fontSize: { xs: 56, md: 96 },
        lineHeight: 0.95,
        textTransform: "uppercase",
        letterSpacing: "-0.01em",
        textShadow: `3px 3px 0 ${pink}, -3px -3px 0 ${blue}`,
      }}
    >
      {children}
    </Typography>
  );
}

function SmallLine({ children }: { children: ReactNode }) {
  return (
    <Typography
      sx={{
        fontFamily: mono,
        fontSize: 16,
        letterSpacing: "0.06em",
        mt: 2,
      }}
    >
      {children}
    </Typography>
  );
}
