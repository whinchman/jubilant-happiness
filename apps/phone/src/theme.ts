import { createTheme } from "@mui/material/styles";

// Risograph Punk Zine — see memory/aesthetic-direction.md
export const bg = "#f7f4ec";
export const bgRecessed = "#ede8db";
export const bgCard = "#ffffff";
export const ink = "#111111";
export const inkDim = "#555550";
export const inkFaint = "#8a8580";
export const hairline = "#d8d0c0";
export const hairlineDark = "#bdb4a0";
export const pink = "#ff3b80";
export const pinkBright = "#ff5e9c";
export const pinkSoft = "#ffd6e3";
export const blue = "#2b6cff";
export const blueDim = "#1f53cc";
export const blueSoft = "#d2dffd";
export const yellow = "#ffe029";
export const red = "#ff2c2c";

export const display = '"Big Shoulders Display Variable", "Anton", Impact, sans-serif';
export const mono = '"DM Mono", "JetBrains Mono", ui-monospace, monospace';

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: pink, dark: "#e02670", light: pinkBright, contrastText: ink },
    secondary: { main: blue, dark: blueDim, light: "#5e8fff", contrastText: bg },
    error: { main: red, contrastText: bg },
    warning: { main: "#e89a00", contrastText: ink },
    info: { main: blue, contrastText: bg },
    background: { default: bg, paper: bgCard },
    text: { primary: ink, secondary: inkDim, disabled: inkFaint },
    divider: hairline,
  },
  shape: { borderRadius: 0 },
  typography: {
    fontFamily: mono,
    h1: {
      fontFamily: display,
      fontWeight: 900,
      letterSpacing: "-0.01em",
      lineHeight: 0.9,
      textTransform: "uppercase",
    },
    h2: {
      fontFamily: display,
      fontWeight: 800,
      letterSpacing: "-0.01em",
      lineHeight: 0.92,
      textTransform: "uppercase",
    },
    h3: {
      fontFamily: display,
      fontWeight: 800,
      lineHeight: 0.95,
      textTransform: "uppercase",
    },
    h4: {
      fontFamily: display,
      fontWeight: 700,
      lineHeight: 1,
      textTransform: "uppercase",
    },
    h5: { fontFamily: display, fontWeight: 700, textTransform: "uppercase" },
    h6: {
      fontFamily: display,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.02em",
      fontSize: 18,
    },
    subtitle1: { fontFamily: mono, fontWeight: 500, fontSize: 14 },
    subtitle2: {
      fontFamily: mono,
      fontWeight: 500,
      fontSize: 11,
      letterSpacing: "0.18em",
      textTransform: "uppercase",
    },
    button: {
      fontFamily: display,
      fontWeight: 800,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
      fontSize: 16,
    },
    overline: {
      fontFamily: mono,
      fontWeight: 500,
      letterSpacing: "0.22em",
      fontSize: 10.5,
      textTransform: "uppercase",
    },
    body1: { fontFamily: mono, fontSize: 14, lineHeight: 1.55 },
    body2: { fontFamily: mono, fontSize: 12.5, lineHeight: 1.5 },
    caption: { fontFamily: mono, fontSize: 11, letterSpacing: "0.04em" },
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
          // Subtle halftone dot noise — fluorescent pink at very low opacity.
          backgroundImage: `radial-gradient(${hairline} 1px, transparent 1px)`,
          backgroundSize: "16px 16px",
          backgroundPosition: "0 0",
        },
        "::selection": { backgroundColor: yellow, color: ink },
        "*::-webkit-scrollbar": { width: 8, height: 8 },
        "*::-webkit-scrollbar-thumb": { backgroundColor: ink, border: `2px solid ${bg}` },
        "*::-webkit-scrollbar-thumb:hover": { backgroundColor: pink },
        "*::-webkit-scrollbar-track": { backgroundColor: "transparent" },
        'input[type="number"]::-webkit-outer-spin-button': {
          WebkitAppearance: "none",
          margin: 0,
        },
        'input[type="number"]::-webkit-inner-spin-button': {
          WebkitAppearance: "none",
          margin: 0,
        },
        'input[type="number"]': { MozAppearance: "textfield" },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: "transparent", position: "static" },
      styleOverrides: {
        root: {
          backgroundColor: ink,
          color: bg,
          backgroundImage: "none",
          borderBottom: `3px solid ${ink}`,
        },
      },
    },
    MuiToolbar: {
      styleOverrides: { root: { minHeight: 56, paddingLeft: 12, paddingRight: 12 } },
    },
    MuiButton: {
      defaultProps: { disableElevation: true, disableRipple: true },
      styleOverrides: {
        root: {
          borderRadius: 0,
          paddingLeft: 16,
          paddingRight: 16,
          paddingTop: 10,
          paddingBottom: 10,
          border: "2px solid transparent",
          transition: "transform 100ms ease, background-color 100ms ease",
          "&:active": { transform: "translate(1px, 1px)" },
        },
        sizeLarge: { paddingTop: 14, paddingBottom: 14, fontSize: 18 },
        contained: {
          backgroundColor: ink,
          color: bg,
          border: `2px solid ${ink}`,
          boxShadow: `4px 4px 0 0 ${pink}`,
          "&:hover": {
            backgroundColor: ink,
            boxShadow: `6px 6px 0 0 ${pink}`,
            transform: "translate(-1px, -1px)",
          },
          "&:active": {
            boxShadow: `2px 2px 0 0 ${pink}`,
            transform: "translate(2px, 2px)",
          },
          "&.Mui-disabled": {
            backgroundColor: bgRecessed,
            color: inkFaint,
            borderColor: hairlineDark,
            boxShadow: "none",
          },
          "&.MuiButton-colorError": {
            backgroundColor: red,
            color: bg,
            borderColor: ink,
            boxShadow: `4px 4px 0 0 ${ink}`,
            "&:hover": { backgroundColor: red, boxShadow: `6px 6px 0 0 ${ink}` },
          },
          "&.MuiButton-colorSecondary": {
            backgroundColor: blue,
            color: bg,
            borderColor: ink,
            boxShadow: `4px 4px 0 0 ${pink}`,
          },
        },
        outlined: {
          backgroundColor: "transparent",
          borderColor: ink,
          borderWidth: 2,
          color: ink,
          "&:hover": {
            backgroundColor: ink,
            color: bg,
            borderColor: ink,
          },
          "&.Mui-disabled": { borderColor: hairlineDark, color: inkFaint },
          "&.MuiButton-colorError": {
            color: red,
            borderColor: red,
            "&:hover": { backgroundColor: red, color: bg },
          },
        },
        text: {
          color: ink,
          textDecoration: "underline",
          textUnderlineOffset: 4,
          textDecorationThickness: 1,
          "&:hover": {
            color: pink,
            backgroundColor: "transparent",
            textDecorationColor: pink,
          },
          "&.MuiButton-colorError": {
            color: red,
            "&:hover": { color: red, textDecorationColor: red },
          },
        },
      },
    },
    MuiIconButton: {
      defaultProps: { disableRipple: true },
      styleOverrides: {
        root: {
          borderRadius: 0,
          color: "inherit",
          "&:hover": { color: pink, backgroundColor: "transparent" },
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundColor: bgCard,
          backgroundImage: "none",
          border: `2px solid ${ink}`,
          borderRadius: 0,
        },
      },
    },
    MuiCard: {
      defaultProps: { variant: "outlined" },
      styleOverrides: {
        root: {
          borderColor: ink,
          borderWidth: 2,
          backgroundColor: bgCard,
          backgroundImage: "none",
          borderRadius: 0,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          fontFamily: mono,
          fontSize: 10.5,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontWeight: 500,
          height: 22,
          border: `1.5px solid ${ink}`,
        },
        filled: { backgroundColor: bg, color: ink },
        outlined: {
          borderColor: blue,
          color: blue,
          backgroundColor: blueSoft,
        },
        sizeSmall: { height: 20, fontSize: 10 },
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
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: pink,
            borderWidth: 2,
          },
        },
        input: { fontFamily: mono, fontSize: 14 },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontFamily: mono,
          fontSize: 12,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          fontWeight: 500,
          color: ink,
          "&.Mui-focused": { color: pink },
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: { fontFamily: mono, fontSize: 11, color: inkDim, marginLeft: 2 },
      },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: ink, borderWidth: 1 } },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          border: `2px solid ${ink}`,
          backgroundColor: bgCard,
          fontFamily: mono,
          fontSize: 13,
          alignItems: "center",
          "&.MuiAlert-standardError": { backgroundColor: red, color: bg, borderColor: ink },
          "&.MuiAlert-standardWarning": { backgroundColor: yellow, color: ink, borderColor: ink },
          "&.MuiAlert-standardInfo": { backgroundColor: blueSoft, color: ink, borderColor: ink },
          "&.MuiAlert-standardSuccess": { backgroundColor: yellow, color: ink, borderColor: ink },
        },
        icon: { color: "inherit" },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: bgCard,
          backgroundImage: "none",
          border: `3px solid ${ink}`,
          borderRadius: 0,
          boxShadow: `8px 8px 0 0 ${pink}`,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontFamily: display,
          fontWeight: 800,
          fontSize: 24,
          textTransform: "uppercase",
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: ink,
          color: bg,
          border: `2px solid ${ink}`,
          fontFamily: mono,
          fontSize: 11,
          borderRadius: 0,
        },
      },
    },
    MuiCircularProgress: {
      defaultProps: { thickness: 4 },
      styleOverrides: { root: { color: pink } },
    },
    MuiAutocomplete: {
      styleOverrides: {
        paper: {
          border: `2px solid ${ink}`,
          backgroundColor: bgCard,
          borderRadius: 0,
        },
        listbox: { fontFamily: mono, fontSize: 13 },
        option: {
          fontFamily: mono,
          fontSize: 13,
          '&[aria-selected="true"]': { backgroundColor: yellow },
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: { color: pink, height: 4 },
        thumb: {
          borderRadius: 0,
          width: 18,
          height: 18,
          backgroundColor: pink,
          border: `2px solid ${ink}`,
          "&:hover, &.Mui-focusVisible": { boxShadow: `0 0 0 6px ${pinkSoft}` },
        },
        rail: { backgroundColor: ink, opacity: 1, height: 4 },
        track: { backgroundColor: pink, border: "none", height: 4 },
        mark: { backgroundColor: ink, width: 2, height: 8 },
        valueLabel: {
          fontFamily: display,
          fontWeight: 700,
          fontSize: 12,
          backgroundColor: ink,
          color: bg,
          border: `2px solid ${ink}`,
          borderRadius: 0,
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          color: ink,
          "&.Mui-checked": { color: pink },
          "&.Mui-checked + .MuiSwitch-track": { backgroundColor: pink, opacity: 1 },
        },
        track: { backgroundColor: hairline, opacity: 1, border: `1px solid ${ink}` },
      },
    },
    MuiCheckbox: {
      defaultProps: { disableRipple: true },
      styleOverrides: { root: { color: ink, "&.Mui-checked": { color: pink } } },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: pink,
          textDecorationColor: pink,
          textUnderlineOffset: 3,
          "&:hover": { color: blue, textDecorationColor: blue },
        },
      },
    },
  },
});
