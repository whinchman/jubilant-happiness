import { useState } from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router";
import {
  ApiError,
  PACKING_CLIMATES,
  PACKING_TRIP_TYPES,
  packingFormSchema,
  type AcceptBreakdownInput,
  type BreakdownPreview,
  type PackingClimate,
  type PackingFormInput,
  type PackingTripType,
} from "@todoer/shared";
import { BreakdownReview } from "../../components/BreakdownReview";
import { Sticker } from "../../components/Chrome";
import { useAcceptBreakdown, useAreas } from "../../lib/api-hooks";
import {
  bg,
  blue,
  display,
  ink,
  inkDim,
  mono,
  pink,
  yellow,
} from "../../theme";
import { usePackingGenerator } from "./use-packing-generator";

interface FormState {
  destination: string;
  nights: string;
  tripType: PackingTripType;
  climate: PackingClimate;
  adults: string;
  children: string;
  dogs: string;
  anythingElse: string;
}

const DEFAULT_FORM: FormState = {
  destination: "",
  nights: "1",
  tripType: "leisure",
  climate: "mild",
  adults: "1",
  children: "0",
  dogs: "0",
  anythingElse: "",
};

function parseForm(s: FormState): PackingFormInput | null {
  const parsed = packingFormSchema.safeParse({
    destination: s.destination,
    nights: Number(s.nights),
    tripType: s.tripType,
    climate: s.climate,
    adults: Number(s.adults),
    children: Number(s.children),
    dogs: Number(s.dogs),
    anythingElse: s.anythingElse.trim() || undefined,
  });
  return parsed.success ? parsed.data : null;
}

export function PackingKitScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const areas = useAreas();
  const generator = usePackingGenerator();
  const accept = useAcceptBreakdown();

  // If we arrived via the suggested-kit CTA, the AddScreen passed the original
  // textarea text in location.state.prefillText — seed it into Anything Else.
  const prefillText =
    typeof (location.state as { prefillText?: unknown } | null)?.prefillText ===
    "string"
      ? ((location.state as { prefillText: string }).prefillText)
      : "";

  const [form, setForm] = useState<FormState>({
    ...DEFAULT_FORM,
    anythingElse: prefillText,
  });
  const [preview, setPreview] = useState<BreakdownPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const validInput = parseForm(form);
  const canSubmit = validInput !== null && !generator.isPending;

  function onSubmit() {
    if (!validInput) return;
    setError(null);
    generator.mutate(validInput, {
      onSuccess: (p) => setPreview(p),
      onError: (err) => {
        if (err instanceof ApiError && err.status === 429) {
          setError("hit the packing kit rate limit — try again in a bit.");
        } else {
          setError(
            "couldn't reach the ai — try again, or add a single task from the add screen.",
          );
        }
      },
    });
  }

  function handleAccept(input: AcceptBreakdownInput) {
    accept.mutate(input, { onSuccess: () => navigate("/board") });
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <Box sx={{ bgcolor: ink, color: bg }}>
        <Toolbar sx={{ minHeight: 56, px: 1 }}>
          <IconButton
            edge="start"
            onClick={() => navigate("/add/kit")}
            aria-label="Back"
            sx={{ color: bg, "&:hover": { color: pink } }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography
            sx={{
              fontFamily: display,
              fontWeight: 900,
              fontSize: 22,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            packing_kit
            <Box component="span" sx={{ color: pink }}>.</Box>
          </Typography>
        </Toolbar>
      </Box>

      <Box sx={{ flexGrow: 1, overflowY: "auto" }}>
        {preview ? (
          <BreakdownReview
            preview={preview}
            areas={areas.data ?? []}
            accepting={accept.isPending}
            error={accept.isError}
            onAccept={handleAccept}
            onStartOver={() => setPreview(null)}
          />
        ) : (
          <Box
            sx={{
              p: 3,
              display: "flex",
              flexDirection: "column",
              gap: 2.5,
              maxWidth: 540,
              mx: "auto",
            }}
          >
            <Box>
              <Sticker color="pink" rotate={-2}>
                pack a trip
              </Sticker>
              <Typography
                sx={{
                  fontFamily: display,
                  fontWeight: 900,
                  fontSize: 38,
                  lineHeight: 0.95,
                  textTransform: "uppercase",
                  letterSpacing: "-0.01em",
                  mt: 1.5,
                  textShadow: `2px 2px 0 ${pink}, -2px -2px 0 ${blue}`,
                }}
              >
                where to,{" "}
                <Box component="span" sx={{ color: pink }}>
                  who's going?
                </Box>
              </Typography>
              <Typography
                sx={{
                  fontFamily: mono,
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: inkDim,
                  mt: 1.5,
                  letterSpacing: "0.04em",
                }}
              >
                fill it in. claude builds a grouped packing list.
              </Typography>
            </Box>

            <TextField
              label="destination"
              value={form.destination}
              onChange={(e) => update("destination", e.target.value)}
              fullWidth
              autoFocus
            />

            <Stack direction="row" spacing={2}>
              <TextField
                label="nights"
                type="number"
                value={form.nights}
                onChange={(e) => update("nights", e.target.value)}
                sx={{ width: 120 }}
                slotProps={{ htmlInput: { min: 0, max: 60 } }}
              />
              <TextField
                select
                label="trip type"
                value={form.tripType}
                onChange={(e) =>
                  update("tripType", e.target.value as PackingTripType)
                }
                fullWidth
              >
                {PACKING_TRIP_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <TextField
              select
              label="climate"
              value={form.climate}
              onChange={(e) => update("climate", e.target.value as PackingClimate)}
              fullWidth
            >
              {PACKING_CLIMATES.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>

            <Box>
              <Typography
                sx={{
                  fontFamily: mono,
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: inkDim,
                  mb: 1,
                }}
              >
                travelers
              </Typography>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="adults"
                  type="number"
                  value={form.adults}
                  onChange={(e) => update("adults", e.target.value)}
                  slotProps={{ htmlInput: { min: 1, max: 20 } }}
                  sx={{ width: 100 }}
                />
                <TextField
                  label="children"
                  type="number"
                  value={form.children}
                  onChange={(e) => update("children", e.target.value)}
                  slotProps={{ htmlInput: { min: 0, max: 20 } }}
                  sx={{ width: 100 }}
                />
                <TextField
                  label="dogs"
                  type="number"
                  value={form.dogs}
                  onChange={(e) => update("dogs", e.target.value)}
                  slotProps={{ htmlInput: { min: 0, max: 20 } }}
                  sx={{ width: 100 }}
                />
              </Stack>
            </Box>

            <TextField
              label="anything else (optional)"
              value={form.anythingElse}
              onChange={(e) => update("anythingElse", e.target.value)}
              multiline
              minRows={2}
              fullWidth
              slotProps={{ htmlInput: { maxLength: 500 } }}
            />

            <Button
              variant="contained"
              size="large"
              startIcon={
                generator.isPending ? (
                  <CircularProgress size={18} sx={{ color: yellow }} />
                ) : undefined
              }
              onClick={onSubmit}
              disabled={!canSubmit}
              sx={{ py: 2.25, fontSize: 18, justifyContent: "space-between" }}
            >
              <Box component="span">
                {generator.isPending ? "packing it…" : "pack it"}
              </Box>
              {!generator.isPending && (
                <Box
                  component="span"
                  sx={{
                    fontFamily: display,
                    fontWeight: 900,
                    fontSize: 24,
                    color: yellow,
                  }}
                >
                  →
                </Box>
              )}
            </Button>

            {error && <Alert severity="warning">{error}</Alert>}
          </Box>
        )}
      </Box>
    </Box>
  );
}
