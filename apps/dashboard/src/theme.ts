import { createTheme } from "@mui/material/styles";

// Risograph Punk Zine — TV scale.
export const bg = "#f7f4ec";
export const bgRecessed = "#ede8db";
export const bgCard = "#ffffff";
export const ink = "#111111";
export const inkDim = "#555550";
export const inkFaint = "#8a8580";
export const hairline = "#d8d0c0";
export const pink = "#ff3b80";
export const blue = "#2b6cff";
export const blueSoft = "#d2dffd";
export const yellow = "#ffe029";
export const red = "#ff2c2c";

export const display = '"Big Shoulders Display Variable", "Anton", Impact, sans-serif';
export const mono = '"DM Mono", "JetBrains Mono", ui-monospace, monospace';

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: pink, contrastText: ink },
    secondary: { main: blue, contrastText: bg },
    error: { main: red },
    background: { default: bg, paper: bgCard },
    text: { primary: ink, secondary: inkDim, disabled: inkFaint },
    divider: hairline,
  },
  shape: { borderRadius: 0 },
  typography: {
    fontFamily: mono,
    h1: { fontFamily: display, fontWeight: 900, textTransform: "uppercase", lineHeight: 0.9 },
    h2: { fontFamily: display, fontWeight: 800, textTransform: "uppercase", lineHeight: 0.92 },
    h3: { fontFamily: display, fontWeight: 800, textTransform: "uppercase", lineHeight: 0.95 },
    h4: { fontFamily: display, fontWeight: 700, textTransform: "uppercase" },
    h5: { fontFamily: display, fontWeight: 700, textTransform: "uppercase" },
    h6: { fontFamily: display, fontWeight: 700, textTransform: "uppercase", fontSize: 22 },
    button: { fontFamily: display, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em" },
    body1: { fontFamily: mono, fontSize: 16, lineHeight: 1.55 },
    body2: { fontFamily: mono, fontSize: 14, lineHeight: 1.5 },
    caption: { fontFamily: mono, fontSize: 12 },
    overline: { fontFamily: mono, fontWeight: 500, letterSpacing: "0.22em", textTransform: "uppercase" },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ":root": { colorScheme: "light" },
        html: { backgroundColor: bg },
        body: {
          backgroundColor: bg,
          color: ink,
          fontFeatureSettings: '"liga", "tnum", "zero"',
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
        },
        "*::-webkit-scrollbar": { width: 10, height: 10 },
        "*::-webkit-scrollbar-thumb": { backgroundColor: ink },
        "*::-webkit-scrollbar-track": { backgroundColor: "transparent" },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundColor: bgCard,
          backgroundImage: "none",
          border: `3px solid ${ink}`,
          borderRadius: 0,
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true, disableRipple: true },
      styleOverrides: {
        root: { borderRadius: 0, paddingLeft: 18, paddingRight: 18, paddingTop: 12, paddingBottom: 12 },
        contained: {
          backgroundColor: ink,
          color: bg,
          border: `2px solid ${ink}`,
          boxShadow: `4px 4px 0 0 ${pink}`,
          "&:hover": { backgroundColor: ink, boxShadow: `6px 6px 0 0 ${pink}` },
        },
        outlined: { borderColor: ink, borderWidth: 2, color: ink },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          fontFamily: mono,
          fontSize: 13,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontWeight: 500,
          height: 28,
          border: `2px solid ${ink}`,
        },
        filled: { backgroundColor: bg, color: ink },
        outlined: { borderColor: blue, color: blue, backgroundColor: blueSoft },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          fontFamily: mono,
          backgroundColor: bgCard,
          "& .MuiOutlinedInput-notchedOutline": { borderColor: ink, borderWidth: 2 },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: pink },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: pink, borderWidth: 2 },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontFamily: mono,
          fontSize: 13,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          fontWeight: 500,
          color: ink,
          "&.Mui-focused": { color: pink },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          border: `2px solid ${ink}`,
          fontFamily: mono,
          "&.MuiAlert-standardError": { backgroundColor: red, color: bg, borderColor: ink },
        },
      },
    },
    MuiCircularProgress: {
      defaultProps: { thickness: 4 },
      styleOverrides: { root: { color: pink } },
    },
  },
});
