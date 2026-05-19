import { createTheme } from "@mui/material/styles";

/** Material Design theme — Material 3 primary purple, mobile-forward. */
export const theme = createTheme({
  palette: {
    primary: { main: "#6750a4" },
    secondary: { main: "#625b71" },
    background: { default: "#f5f2fa" },
  },
  shape: { borderRadius: 12 },
});
