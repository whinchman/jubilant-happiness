import type { ReactNode } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { fetchAuthStatus } from "@todoer/shared";
import { DashboardBoard } from "./DashboardBoard";
import { DashboardLogin } from "./DashboardLogin";

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
        <Typography color="error">Can't reach the server.</Typography>
      </Center>
    );
  }
  if (status.data.needsSetup) {
    return (
      <Center>
        <Typography>Set up TODO-ER on your phone first.</Typography>
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
