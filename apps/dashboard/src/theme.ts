import { createTheme } from "@mui/material/styles";

/** Dark theme — easy on the eyes for a wall-mounted / TV dashboard. */
export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#cfbcff" },
    background: { default: "#181527", paper: "#241f38" },
  },
  shape: { borderRadius: 14 },
});
