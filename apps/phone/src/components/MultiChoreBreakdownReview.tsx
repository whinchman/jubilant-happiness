import { useState } from "react";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type {
  AcceptMegaChoreBreakdownInput,
  MegaChoreBreakdownPreview,
} from "@todoer/shared";
import {
  bg,
  bgCard,
  blue,
  display,
  ink,
  inkDim,
  mono,
  pink,
  yellow,
} from "../theme";

interface EditableStep {
  key: string;
  title: string;
  estimate: string;
  notes: string;
  notesExpanded: boolean;
}

interface EditableChore {
  key: string;
  title: string;
  estimate: string;
  group: number;
  steps: EditableStep[];
  expanded: boolean;
}

interface MultiChoreBreakdownReviewProps {
  preview: MegaChoreBreakdownPreview;
  areas: string[];
  accepting: boolean;
  error: boolean;
  onAccept: (input: AcceptMegaChoreBreakdownInput) => void;
  onStartOver: () => void;
}

let keyCounter = 0;
const nextKey = (p: string) => `${p}-${keyCounter++}`;

export function MultiChoreBreakdownReview({
  preview,
  areas,
  accepting,
  error,
  onAccept,
  onStartOver,
}: MultiChoreBreakdownReviewProps) {
  const [megaTitle, setMegaTitle] = useState(preview.megaChore.title);
  const [area, setArea] = useState(preview.area);
  const [chores, setChores] = useState<EditableChore[]>(() =>
    preview.chores.map((c) => ({
      key: nextKey("chore"),
      title: c.title,
      estimate: String(c.estimateMinutes),
      group: c.group,
      expanded: c.group === 1,
      steps: c.steps.map((s) => ({
        key: nextKey("step"),
        title: s.title,
        estimate: String(s.estimateMinutes),
        notes: s.notes ?? "",
        notesExpanded: false,
      })),
    })),
  );

  const sortedChores = [...chores].sort((a, b) => a.group - b.group);
  const groupValues = Array.from(new Set(sortedChores.map((c) => c.group))).sort(
    (a, b) => a - b,
  );

  // Group sequence must be consecutive 1..K. Compute K from current values.
  function nextK(): number {
    return groupValues.length;
  }

  function canBumpDown(group: number): boolean {
    // Can move into the next group if it already exists, or if appending K+1
    // wouldn't leave a gap (only allowed when there are still chores left
    // behind in the current group).
    const next = group + 1;
    if (groupValues.includes(next)) return true;
    if (next === nextK() + 1) {
      const inCurrent = sortedChores.filter((c) => c.group === group).length;
      return inCurrent > 1;
    }
    return false;
  }

  function canBumpUp(group: number): boolean {
    return group > 1;
  }

  function bump(key: string, delta: number) {
    setChores((current) => {
      const target = current.find((c) => c.key === key);
      if (!target) return current;
      const newGroup = target.group + delta;
      if (newGroup < 1) return current;
      const updated = current.map((c) =>
        c.key === key ? { ...c, group: newGroup } : c,
      );
      // Compact group sequence so it stays 1..K with no gaps.
      const used = Array.from(new Set(updated.map((c) => c.group))).sort(
        (a, b) => a - b,
      );
      const remap = new Map<number, number>();
      used.forEach((g, i) => remap.set(g, i + 1));
      return updated.map((c) => ({ ...c, group: remap.get(c.group) ?? c.group }));
    });
  }

  function updateChore<K extends keyof EditableChore>(
    key: string,
    field: K,
    value: EditableChore[K],
  ) {
    setChores((cs) =>
      cs.map((c) => (c.key === key ? { ...c, [field]: value } : c)),
    );
  }

  function updateStep<K extends keyof EditableStep>(
    choreKey: string,
    stepKey: string,
    field: K,
    value: EditableStep[K],
  ) {
    setChores((cs) =>
      cs.map((c) =>
        c.key === choreKey
          ? {
              ...c,
              steps: c.steps.map((s) =>
                s.key === stepKey ? { ...s, [field]: value } : s,
              ),
            }
          : c,
      ),
    );
  }

  function isFormValid(): boolean {
    if (megaTitle.trim().length === 0) return false;
    if (area.trim().length === 0) return false;
    if (chores.length < 2 || chores.length > 10) return false;
    for (const c of chores) {
      if (c.title.trim().length === 0) return false;
      if (!Number.isFinite(Number(c.estimate))) return false;
      if (c.steps.length < 1 || c.steps.length > 30) return false;
      for (const s of c.steps) {
        if (s.title.trim().length === 0) return false;
        if (!Number.isFinite(Number(s.estimate))) return false;
      }
    }
    return true;
  }

  function submit() {
    if (!isFormValid()) return;
    const payload: AcceptMegaChoreBreakdownInput = {
      megaChore: { title: megaTitle.trim() },
      area: area.trim(),
      chores: sortedChores.map((c) => ({
        title: c.title.trim(),
        estimateMinutes: Math.max(1, Math.round(Number(c.estimate))),
        group: c.group,
        steps: c.steps.map((s) => ({
          title: s.title.trim(),
          estimateMinutes: Math.max(1, Math.round(Number(s.estimate))),
          notes: s.notes.trim() ? s.notes.trim() : undefined,
        })),
      })),
    };
    onAccept(payload);
  }

  return (
    <Box sx={{ p: 2, maxWidth: 640, mx: "auto" }}>
      <Typography
        sx={{
          fontFamily: display,
          fontWeight: 900,
          fontSize: 28,
          textTransform: "uppercase",
          letterSpacing: "-0.01em",
          mb: 2,
        }}
      >
        review the mega chore
      </Typography>

      <Stack spacing={2} sx={{ mb: 2 }}>
        <TextField
          label="mega chore"
          value={megaTitle}
          onChange={(e) => setMegaTitle(e.target.value)}
          fullWidth
        />
        <Autocomplete
          freeSolo
          options={areas}
          value={area}
          onInputChange={(_e, v) => setArea(v ?? "")}
          renderInput={(params) => <TextField {...params} label="area" />}
        />
      </Stack>

      {groupValues.map((g) => (
        <Box key={`g-${g}`} sx={{ mb: 2 }}>
          <Typography
            sx={{
              fontFamily: mono,
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: inkDim,
              borderBottom: `1px solid ${ink}`,
              pb: 0.5,
              mb: 1,
            }}
          >
            group {g}
          </Typography>
          <Stack spacing={1.25}>
            {sortedChores
              .filter((c) => c.group === g)
              .map((c) => (
                <Box
                  key={c.key}
                  sx={{
                    border: `2px solid ${ink}`,
                    bgcolor: bgCard,
                    p: 1.5,
                  }}
                >
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <TextField
                      value={c.title}
                      onChange={(e) => updateChore(c.key, "title", e.target.value)}
                      placeholder="chore title"
                      fullWidth
                      size="small"
                    />
                    <TextField
                      value={c.estimate}
                      onChange={(e) =>
                        updateChore(c.key, "estimate", e.target.value)
                      }
                      placeholder="min"
                      size="small"
                      sx={{ width: 80 }}
                      slotProps={{ htmlInput: { inputMode: "numeric" } }}
                    />
                    <IconButton
                      size="small"
                      disabled={!canBumpUp(c.group)}
                      onClick={() => bump(c.key, -1)}
                      aria-label="bump group up"
                    >
                      <ArrowUpwardIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      disabled={!canBumpDown(c.group)}
                      onClick={() => bump(c.key, +1)}
                      aria-label="bump group down"
                    >
                      <ArrowDownwardIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => updateChore(c.key, "expanded", !c.expanded)}
                      aria-label="toggle steps"
                    >
                      {c.expanded ? (
                        <ExpandLessIcon fontSize="small" />
                      ) : (
                        <ExpandMoreIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Stack>

                  {!c.expanded && (
                    <Typography
                      sx={{
                        fontFamily: mono,
                        fontSize: 11,
                        color: inkDim,
                        mt: 0.5,
                      }}
                    >
                      {c.steps.length} step{c.steps.length === 1 ? "" : "s"}
                    </Typography>
                  )}

                  {c.expanded && (
                    <Stack spacing={0.75} sx={{ mt: 1.25 }}>
                      {c.steps.map((s) => (
                        <Box key={s.key}>
                          <Stack
                            direction="row"
                            spacing={1}
                            sx={{ alignItems: "flex-start" }}
                          >
                            <TextField
                              value={s.title}
                              onChange={(e) =>
                                updateStep(c.key, s.key, "title", e.target.value)
                              }
                              placeholder="step"
                              fullWidth
                              size="small"
                            />
                            <TextField
                              value={s.estimate}
                              onChange={(e) =>
                                updateStep(c.key, s.key, "estimate", e.target.value)
                              }
                              size="small"
                              sx={{ width: 80 }}
                              slotProps={{ htmlInput: { inputMode: "numeric" } }}
                            />
                          </Stack>
                          {s.notes.length > 0 || s.notesExpanded ? (
                            <TextField
                              value={s.notes}
                              onChange={(e) =>
                                updateStep(c.key, s.key, "notes", e.target.value)
                              }
                              placeholder="notes (optional)"
                              fullWidth
                              multiline
                              minRows={1}
                              maxRows={4}
                              size="small"
                              sx={{
                                mt: 0.5,
                                "& textarea": {
                                  fontFamily: mono,
                                  fontSize: 11,
                                  color: inkDim,
                                },
                                "& .MuiOutlinedInput-notchedOutline": {
                                  border: "none",
                                },
                              }}
                              slotProps={{ htmlInput: { maxLength: 2000 } }}
                            />
                          ) : (
                            <Box
                              role="button"
                              tabIndex={0}
                              onClick={() =>
                                updateStep(c.key, s.key, "notesExpanded", true)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  updateStep(c.key, s.key, "notesExpanded", true);
                                }
                              }}
                              sx={{
                                mt: 0.5,
                                fontFamily: mono,
                                fontSize: 10,
                                color: inkDim,
                                cursor: "pointer",
                                letterSpacing: "0.1em",
                                textTransform: "uppercase",
                              }}
                            >
                              + add notes
                            </Box>
                          )}
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Box>
              ))}
          </Stack>
        </Box>
      ))}

      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        <Button variant="outlined" onClick={onStartOver}>
          start over
        </Button>
        <Button
          variant="contained"
          onClick={submit}
          disabled={!isFormValid() || accepting}
          sx={{ flexGrow: 1 }}
        >
          {accepting ? "making it…" : `make it · ${chores.length} chores`}
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          couldn't save — try again.
        </Alert>
      )}
    </Box>
  );
}
