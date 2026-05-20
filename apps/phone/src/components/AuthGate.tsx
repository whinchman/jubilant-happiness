import type { ReactNode } from "react";
import { Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { useAuthStatus } from "../lib/api-hooks";
import { AuthScreen } from "../screens/AuthScreen";
import { Sticker } from "./Chrome";
import { blue, display, pink } from "../theme";

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
          <Sticker color="pink" rotate={-3}>offline?</Sticker>
          <Typography
            sx={{
              fontFamily: display,
              fontWeight: 900,
              fontSize: 40,
              textTransform: "uppercase",
              lineHeight: 0.95,
              textShadow: `2px 2px 0 ${pink}, -2px -2px 0 ${blue}`,
              mt: 1,
            }}
          >
            no signal<Box component="span" sx={{ color: pink }}>.</Box>
          </Typography>
          <Button variant="contained" onClick={() => void status.refetch()} size="large">
            try again →
          </Button>
        </Stack>
      </Centered>
    );
  }

  if (!status.data.authenticated) {
    // Fresh deploy with no users → default to signup. Otherwise default to login (toggleable).
    const defaultMode = status.data.needsSetup ? "setup" : "login";
    return (
      <AuthScreen
        defaultMode={defaultMode}
        requiresSetupToken={status.data.requiresSetupToken}
      />
    );
  }
  return <>{children}</>;
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ height: "100dvh", display: "grid", placeItems: "center", p: 3 }}>
      {children}
    </Box>
  );
}
