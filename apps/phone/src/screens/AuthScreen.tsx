import { useState } from "react";
import { Alert, Box, Button, TextField, Typography } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import { APP_NAME } from "@todoer/shared";
import { useLogin, useSetup } from "../lib/api-hooks";

export function AuthScreen({ mode }: { mode: "setup" | "login" }) {
  const qc = useQueryClient();
  const setup = useSetup();
  const login = useLogin();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const isSetup = mode === "setup";
  const mutation = isSetup ? setup : login;
  const canSubmit =
    username.trim().length > 0 && password.length >= 6 && !mutation.isPending;

  function submit() {
    if (!canSubmit) return;
    mutation.mutate(
      { username: username.trim(), password },
      { onSuccess: () => void qc.invalidateQueries({ queryKey: ["authStatus"] }) },
    );
  }

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
          ? "Create your account to get started."
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
      {mutation.isError && (
        <Alert severity="error">
          {isSetup
            ? "Couldn't create the account. Try again."
            : "Wrong username or password."}
        </Alert>
      )}
      <Button
        variant="contained"
        size="large"
        disabled={!canSubmit}
        onClick={submit}
        sx={{ py: 1.5 }}
      >
        {isSetup ? "Create account" : "Log in"}
      </Button>
    </Box>
  );
}
