import { useState } from "react";
import { Alert, Box, Button, TextField, Typography } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError, APP_NAME } from "@todoer/shared";
import { useLogin, useSetup } from "../lib/api-hooks";

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
      if (err.status === 429) {
        return "Too many attempts — try again in a few minutes.";
      }
      if (err.status === 401 && isSetup) {
        return "That invite token isn't right.";
      }
      if (err.status === 401) {
        return "Wrong username or password.";
      }
      if (err.status === 409) {
        return "That username is taken — try a different one.";
      }
    }
    return isSetup
      ? "Couldn't create the account. Try again."
      : "Something went wrong. Try again.";
  })();

  return (
    <Box
      sx={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 2,
        p: 4,
        maxWidth: 400,
        mx: "auto",
        width: "100%",
      }}
    >
      <Typography variant="h4" sx={{ fontWeight: 800 }}>
        {APP_NAME}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 1 }}>
        {isSetup
          ? "Create an account to get started."
          : "Welcome back — log in to continue."}
      </Typography>
      <TextField
        label="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoFocus
        fullWidth
      />
      <TextField
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        helperText={isSetup ? "At least 6 characters" : " "}
        fullWidth
      />
      {isSetup && requiresSetupToken && (
        <TextField
          label="Invite token"
          value={setupToken}
          onChange={(e) => setSetupToken(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          helperText="Required to sign up on this deployment"
          fullWidth
        />
      )}
      {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
      <Button
        variant="contained"
        size="large"
        disabled={!canSubmit}
        onClick={submit}
        sx={{ py: 1.5 }}
      >
        {isSetup ? "Create account" : "Log in"}
      </Button>
      <Button onClick={toggleMode} sx={{ color: "text.secondary" }}>
        {isSetup ? "Have an account? Log in" : "Have an invite? Sign up"}
      </Button>
    </Box>
  );
}
