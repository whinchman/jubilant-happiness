import { useState } from "react";
import { Alert, Box, Button, Stack, TextField, Typography } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError, APP_NAME } from "@todoer/shared";
import {
  OffsetHeadline,
  StampFooter,
  Sticker,
  TornRule,
  dayOfYearLabel,
  isoStamp,
} from "../components/Chrome";
import { useLogin, useSetup } from "../lib/api-hooks";
import { bg, blue, display, ink, inkDim, mono, pink } from "../theme";

interface AuthScreenProps {
  defaultMode: "setup" | "login";
  requiresSetupToken?: boolean;
}

export function AuthScreen({
  defaultMode,
  requiresSetupToken = false,
}: AuthScreenProps) {
  const qc = useQueryClient();
  const setup = useSetup();
  const login = useLogin();
  const [mode, setMode] = useState<"setup" | "login">(defaultMode);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [setupToken, setSetupToken] = useState("");

  const isSetup = mode === "setup";
  const mutation = isSetup ? setup : login;
  const tokenOk = !isSetup || !requiresSetupToken || setupToken.length > 0;
  const canSubmit =
    username.trim().length > 0 &&
    password.length >= 6 &&
    tokenOk &&
    !mutation.isPending;

  function toggleMode() {
    setup.reset();
    login.reset();
    setMode(isSetup ? "login" : "setup");
  }

  function submit() {
    if (!canSubmit) return;
    const invalidate = () =>
      void qc.invalidateQueries({ queryKey: ["authStatus"] });
    if (isSetup) {
      setup.mutate(
        {
          username: username.trim(),
          password,
          setupToken: setupToken.length > 0 ? setupToken : undefined,
        },
        { onSuccess: invalidate },
      );
    } else {
      login.mutate(
        { username: username.trim(), password },
        { onSuccess: invalidate },
      );
    }
  }

  const errorMessage = (() => {
    if (!mutation.isError) return null;
    const err = mutation.error;
    if (err instanceof ApiError) {
      if (err.status === 429) return "too many tries. try again in a few.";
      if (err.status === 401 && isSetup) return "that invite token isn't right.";
      if (err.status === 401) return "wrong username or password.";
      if (err.status === 409) return "that username is taken.";
    }
    return isSetup
      ? "couldn't create the account. try again."
      : "something went wrong. try again.";
  })();

  return (
    <Box sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 2.5,
          py: 1.5,
          bgcolor: ink,
          color: bg,
        }}
      >
        <Typography
          sx={{
            fontFamily: display,
            fontWeight: 900,
            fontSize: 22,
            letterSpacing: "0.02em",
            textTransform: "uppercase",
          }}
        >
          {APP_NAME}
          <Box component="span" sx={{ color: pink }}>
            !
          </Box>
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Box sx={{ transform: "translateY(-2px)" }}>
          <Sticker color={isSetup ? "yellow" : "pink"} rotate={3} size="sm">
            {isSetup ? "new account" : "sign in"}
          </Sticker>
        </Box>
      </Box>

      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 3,
          px: 3,
          py: 4,
          maxWidth: 440,
          mx: "auto",
          width: "100%",
        }}
      >
        <Box>
          <Typography
            variant="overline"
            sx={{
              color: pink,
              display: "block",
              fontWeight: 600,
              letterSpacing: "0.22em",
              mb: 1,
            }}
          >
            ▍ {isSetup ? dayOfYearLabel() + " · day one" : "welcome back"}
          </Typography>
          <Box>
            {isSetup ? (
              <>
                <OffsetHeadline size={56} color={pink} italic>
                  start
                </OffsetHeadline>{" "}
                <OffsetHeadline size={56}>a pile.</OffsetHeadline>
              </>
            ) : (
              <>
                <OffsetHeadline size={56}>sign</OffsetHeadline>{" "}
                <OffsetHeadline size={56} color={blue} italic>
                  in.
                </OffsetHeadline>
              </>
            )}
          </Box>
        </Box>

        <Stack spacing={2}>
          <TextField
            label="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            fullWidth
          />
          <TextField
            label="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            helperText={isSetup ? "at least 6 characters" : " "}
            fullWidth
          />
          {isSetup && requiresSetupToken && (
            <TextField
              label="invite token"
              value={setupToken}
              onChange={(e) => setSetupToken(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              helperText="required for this deployment"
              fullWidth
            />
          )}
          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
          <Button
            variant="contained"
            size="large"
            disabled={!canSubmit}
            onClick={submit}
            sx={{
              py: 2,
              fontSize: 20,
              justifyContent: "center",
            }}
          >
            {mutation.isPending
              ? "…"
              : isSetup
                ? "Create Account"
                : "Sign In"}
          </Button>
        </Stack>

        <TornRule mt={1} />

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Typography
            sx={{
              fontFamily: mono,
              fontSize: 11,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: inkDim,
              flexGrow: 1,
            }}
          >
            {isSetup ? "already on the list?" : "have an invite token?"}
          </Typography>
          <Button
            onClick={toggleMode}
            variant="text"
            sx={{
              fontFamily: mono,
              fontWeight: 500,
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: ink,
              p: 0,
              minWidth: 0,
              textDecorationThickness: 2,
            }}
          >
            {isSetup ? "sign in →" : "sign up →"}
          </Button>
        </Box>
      </Box>

      <StampFooter
        left={isSetup ? "welcome in" : "ready when you are"}
        right={isoStamp()}
      />
    </Box>
  );
}
