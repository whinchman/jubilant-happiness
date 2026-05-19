import type { ReactNode } from "react";
import { Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { useAuthStatus } from "../lib/api-hooks";
import { AuthScreen } from "../screens/AuthScreen";

/** Gates the app: first-run setup, then login, then the app itself. */
export function AuthGate({ children }: { children: ReactNode }) {
  const status = useAuthStatus();

  if (status.isLoading) {
    return (
      <Centered>
        <CircularProgress />
      </Centered>
    );
  }

  if (status.isError || !status.data) {
    return (
      <Centered>
        <Stack spacing={2} sx={{ alignItems: "center", textAlign: "center" }}>
          <Typography color="error">Can't reach the server.</Typography>
          <Button variant="contained" onClick={() => void status.refetch()}>
            Retry
          </Button>
        </Stack>
      </Centered>
    );
  }

  if (status.data.needsSetup) return <AuthScreen mode="setup" />;
  if (!status.data.authenticated) return <AuthScreen mode="login" />;
  return <>{children}</>;
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ height: "100dvh", display: "grid", placeItems: "center", p: 3 }}>
      {children}
    </Box>
  );
}
