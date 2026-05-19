import { useEffect, useState } from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  Alert,
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
} from "@mui/material";
import type { Task } from "@todoer/shared";
import { useAreas, useDeleteTask, useUpdateTask } from "../lib/api-hooks";
import { ConfirmDialog } from "./ConfirmDialog";

interface EditTaskDialogProps {
  task: Task | null;
  onClose: () => void;
}

export function EditTaskDialog({ task, onClose }: EditTaskDialogProps) {
  const [title, setTitle] = useState("");
  const [estimate, setEstimate] = useState("10");
  const [area, setArea] = useState("");
  const [notes, setNotes] = useState("");
  const [repeating, setRepeating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const areas = useAreas();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setEstimate(String(task.estimateMinutes));
      setArea(task.area ?? "");
      setNotes(task.notes);
      setRepeating(task.isRepeating);
    }
  }, [task]);

  const estimateNum = Number(estimate);
  const estimateValid =
    Number.isInteger(estimateNum) && estimateNum >= 1 && estimateNum <= 600;
  const busy = updateTask.isPending || deleteTask.isPending;
  const canSave = task !== null && title.trim().length > 0 && estimateValid && !busy;

  function handleClose() {
    if (busy) return;
    updateTask.reset();
    deleteTask.reset();
    onClose();
  }

  function save() {
    if (!task || !canSave) return;
    updateTask.mutate(
      {
        id: task.id,
        input: {
          title: title.trim(),
          estimateMinutes: estimateNum,
          area: area.trim() || null,
          notes: notes.trim(),
          isRepeating: repeating,
        },
      },
      { onSuccess: () => handleClose() },
    );
  }

  function confirmDelete() {
    if (!task) return;
    deleteTask.mutate(task.id, {
      onSuccess: () => {
        setConfirmOpen(false);
        handleClose();
      },
    });
  }

  return (
    <>
      <Dialog open={task !== null} onClose={handleClose} fullWidth maxWidth="xs">
        <DialogTitle>Edit task</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
            />
            <TextField
              label="Estimate (minutes)"
              value={estimate}
              type="number"
              onChange={(e) => setEstimate(e.target.value)}
              error={estimate !== "" && !estimateValid}
              helperText={
                estimate !== "" && !estimateValid ? "Use 1–600 minutes" : " "
              }
              fullWidth
            />
            <Autocomplete
              freeSolo
              options={areas.data ?? []}
              inputValue={area}
              onInputChange={(_, value) => setArea(value)}
              renderInput={(params) => (
                <TextField {...params} label="Area (optional)" />
              )}
            />
            <TextField
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              multiline
              minRows={2}
              fullWidth
            />
            <FormControlLabel
              control={
                <Switch
                  checked={repeating}
                  onChange={(e) => setRepeating(e.target.checked)}
                />
              }
              label="Repeats weekly"
            />
            {updateTask.isError && (
              <Alert severity="error">Couldn't save changes.</Alert>
            )}
            {deleteTask.isError && (
              <Alert severity="error">Couldn't delete the task.</Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between", px: 3, pb: 2 }}>
          <Button
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setConfirmOpen(true)}
            disabled={busy}
          >
            Delete
          </Button>
          <Stack direction="row" spacing={1}>
            <Button onClick={handleClose} disabled={busy}>
              Cancel
            </Button>
            <Button variant="contained" onClick={save} disabled={!canSave}>
              Save
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this task?"
        message="This can't be undone."
        confirmLabel="Delete"
        confirmColor="error"
        busy={deleteTask.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
