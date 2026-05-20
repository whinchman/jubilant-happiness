import { useState } from "react";
import { Alert, Box, Button, Stack, TextField, Typography } from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { APP_NAME, login } from "@todoer/shared";
import { bg, blue, display, ink, inkDim, mono, pink, yellow } from "./theme";

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
    <Box sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <Box sx={{ bgcolor: ink, color: bg, px: 4, py: 2 }}>
        <Typography
          sx={{
            fontFamily: display,
            fontWeight: 900,
            fontSize: 28,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {APP_NAME}
          <Box component="span" sx={{ color: pink }}>!</Box>{" "}
          <Box
            component="span"
            sx={{
              fontFamily: mono,
              fontWeight: 500,
              fontSize: 16,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: yellow,
              ml: 1,
            }}
          >
            dashboard
          </Box>
        </Typography>
      </Box>

      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 3,
          p: 6,
          maxWidth: 560,
          mx: "auto",
          width: "100%",
        }}
      >
        <Typography
          sx={{
            fontFamily: display,
            fontWeight: 900,
            fontSize: 56,
            lineHeight: 0.95,
            textTransform: "uppercase",
            letterSpacing: "-0.01em",
            textShadow: `3px 3px 0 ${pink}, -3px -3px 0 ${blue}`,
          }}
        >
          sign{" "}
          <Box component="span" sx={{ color: blue }}>
            in.
          </Box>
        </Typography>
        <Typography
          sx={{
            fontFamily: mono,
            fontSize: 14,
            letterSpacing: "0.06em",
            color: inkDim,
          }}
        >
          show the board on this screen.
        </Typography>

        <Stack spacing={2.5}>
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
            fullWidth
          />
          {mutation.isError && <Alert severity="error">wrong username or password.</Alert>}
          <Button
            variant="contained"
            size="large"
            disabled={!canSubmit}
            onClick={submit}
            sx={{
              py: 2.5,
              fontSize: 22,
              justifyContent: "space-between",
            }}
          >
            <Box component="span">log in</Box>
            <Box
              component="span"
              sx={{ fontFamily: display, fontWeight: 900, fontSize: 28, color: yellow }}
            >
              →
            </Box>
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
