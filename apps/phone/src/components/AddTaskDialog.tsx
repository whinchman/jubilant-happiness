import { useState } from "react";
import {
  Alert,
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import { useAreas, useCreateTask } from "../lib/api-hooks";

interface AddTaskDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AddTaskDialog({ open, onClose }: AddTaskDialogProps) {
  const [title, setTitle] = useState("");
  const [estimate, setEstimate] = useState("10");
  const [area, setArea] = useState("");
  const areas = useAreas();
  const createTask = useCreateTask();

  const estimateNum = Number(estimate);
  const estimateValid =
    Number.isInteger(estimateNum) && estimateNum >= 1 && estimateNum <= 600;
  const canSubmit = title.trim().length > 0 && estimateValid && !createTask.isPending;

  function reset() {
    setTitle("");
    setEstimate("10");
    setArea("");
    createTask.reset();
  }

  function handleClose() {
    if (createTask.isPending) return;
    reset();
    onClose();
  }

  function submit() {
    if (!canSubmit) return;
    createTask.mutate(
      {
        title: title.trim(),
        estimateMinutes: estimateNum,
        area: area.trim() || null,
      },
      {
        onSuccess: () => {
          reset();
          onClose();
        },
      },
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle>Add a task</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="What needs doing?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            fullWidth
          />
          <TextField
            label="Estimate (minutes)"
            value={estimate}
            onChange={(e) => setEstimate(e.target.value)}
            type="number"
            error={estimate !== "" && !estimateValid}
            helperText={estimate !== "" && !estimateValid ? "Use 1–600 minutes" : " "}
            fullWidth
          />
          <Autocomplete
            freeSolo
            options={areas.data ?? []}
            inputValue={area}
            onInputChange={(_, value) => setArea(value)}
            renderInput={(params) => <TextField {...params} label="Area (optional)" />}
          />
          {createTask.isError && (
            <Alert severity="error">Couldn't add the task. Try again.</Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={createTask.isPending}>
          Cancel
        </Button>
        <Button onClick={submit} variant="contained" disabled={!canSubmit}>
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
}
