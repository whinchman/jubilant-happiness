import { useState } from "react";
import { Alert, Box, Button, TextField, Typography } from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { APP_NAME, login } from "@todoer/shared";

export function DashboardLogin() {
  const qc = useQueryClient();
  const mutation = useMutation({ mutationFn: login });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

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
        maxWidth: 420,
        mx: "auto",
        width: "100%",
      }}
    >
      <Typography variant="h4" sx={{ fontWeight: 800 }}>
        {APP_NAME} — Dashboard
      </Typography>
      <Typography color="text.secondary">Log in to show the board.</Typography>
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
        fullWidth
      />
      {mutation.isError && <Alert severity="error">Wrong username or password.</Alert>}
      <Button
        variant="contained"
        size="large"
        disabled={!canSubmit}
        onClick={submit}
        sx={{ py: 1.5 }}
      >
        Log in
      </Button>
    </Box>
  );
}
