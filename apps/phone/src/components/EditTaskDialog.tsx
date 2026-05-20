import { useEffect, useMemo, useRef, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "@todoer/shared";
import {
  useAreas,
  useBoard,
  useCreateStep,
  useDeleteStep,
  useDeleteTask,
  useMoveStep,
  useUpdateStep,
  useUpdateTask,
} from "../lib/api-hooks";
import { findChoreInBoard } from "../lib/board-dnd";
import { ConfirmDialog } from "./ConfirmDialog";

interface EditTaskDialogProps {
  /** Chore being edited; passing `null` closes the dialog. */
  choreId: string | null;
  onClose: () => void;
}

export function EditTaskDialog({ choreId, onClose }: EditTaskDialogProps) {
  const board = useBoard();
  // Always read the latest chore + steps from the board cache so that step
  // mutations made inside the dialog reflect immediately on re-render.
  const chore = useMemo(() => {
    if (!choreId || !board.data) return null;
    return findChoreInBoard(board.data, choreId);
  }, [choreId, board.data]);

  const [title, setTitle] = useState("");
  const [estimate, setEstimate] = useState("10");
  const [area, setArea] = useState("");
  const [notes, setNotes] = useState("");
  const [repeating, setRepeating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingFocusStepId, setPendingFocusStepId] = useState<string | null>(null);

  const areas = useAreas();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const createStep = useCreateStep();

  // Sync form state when the dialog opens on a (different) chore. After the
  // initial sync, user edits remain user-controlled even as board data refetches.
  useEffect(() => {
    if (!chore) return;
    setTitle(chore.title);
    setEstimate(String(chore.estimateMinutes));
    setArea(chore.area ?? "");
    setNotes(chore.notes);
    setRepeating(chore.isRepeating);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chore?.id]);

  const estimateNum = Number(estimate);
  const estimateValid =
    Number.isInteger(estimateNum) && estimateNum >= 1 && estimateNum <= 600;
  const busy = updateTask.isPending || deleteTask.isPending;
  const canSave =
    chore !== null && title.trim().length > 0 && estimateValid && !busy;

  function handleClose() {
    if (busy) return;
    updateTask.reset();
    deleteTask.reset();
    onClose();
  }

  function save() {
    if (!chore || !canSave) return;
    updateTask.mutate(
      {
        id: chore.id,
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
    if (!chore) return;
    deleteTask.mutate(chore.id, {
      onSuccess: () => {
        setConfirmOpen(false);
        handleClose();
      },
    });
  }

  function addStep() {
    if (!chore) return;
    createStep.mutate(
      {
        choreId: chore.id,
        input: { title: "New step", estimateMinutes: 5 },
      },
      {
        onSuccess: (step) => setPendingFocusStepId(step.id),
      },
    );
  }

  return (
    <>
      <Dialog
        open={choreId !== null}
        onClose={handleClose}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Edit chore</DialogTitle>
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
              value={area}
              onChange={(_, value) => setArea(value ?? "")}
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
              <Alert severity="error">Couldn't delete the chore.</Alert>
            )}

            {chore && (
              <>
                <Divider>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Steps
                  </Typography>
                </Divider>
                <StepsSection
                  choreId={chore.id}
                  steps={chore.steps}
                  pendingFocusStepId={pendingFocusStepId}
                  clearPendingFocus={() => setPendingFocusStepId(null)}
                />
                <Button
                  startIcon={<AddIcon />}
                  onClick={addStep}
                  disabled={createStep.isPending}
                  sx={{ alignSelf: "flex-start" }}
                >
                  Add step
                </Button>
              </>
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
        title="Delete this chore?"
        message="All steps inside it will also be deleted. This can't be undone."
        confirmLabel="Delete"
        confirmColor="error"
        busy={deleteTask.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}

interface StepsSectionProps {
  choreId: string;
  steps: Task[];
  pendingFocusStepId: string | null;
  clearPendingFocus: () => void;
}

function StepsSection({
  choreId,
  steps,
  pendingFocusStepId,
  clearPendingFocus,
}: StepsSectionProps) {
  const moveStep = useMoveStep();
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const activeIdx = steps.findIndex((s) => s.id === active.id);
    const overIdx = steps.findIndex((s) => s.id === over.id);
    if (activeIdx === -1 || overIdx === -1) return;

    const reordered = arrayMove(steps, activeIdx, overIdx);
    const newIdx = reordered.findIndex((s) => s.id === active.id);
    const predecessor = reordered[newIdx - 1];
    const successor = reordered[newIdx + 1];
    const input = predecessor
      ? { afterId: predecessor.id }
      : successor
        ? { beforeId: successor.id }
        : {};

    moveStep.mutate({ choreId, stepId: String(active.id), input });
  }

  if (steps.length === 0) {
    return (
      <Typography variant="caption" sx={{ color: "text.secondary", pl: 1 }}>
        No steps yet.
      </Typography>
    );
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <SortableContext
        items={steps.map((s) => s.id)}
        strategy={verticalListSortingStrategy}
      >
        <Stack spacing={0.5}>
          {steps.map((step) => (
            <StepRow
              key={step.id}
              step={step}
              choreId={choreId}
              autoFocus={pendingFocusStepId === step.id}
              onAutoFocused={clearPendingFocus}
            />
          ))}
        </Stack>
      </SortableContext>
    </DndContext>
  );
}

interface StepRowProps {
  step: Task;
  choreId: string;
  autoFocus: boolean;
  onAutoFocused: () => void;
}

function StepRow({ step, choreId, autoFocus, onAutoFocused }: StepRowProps) {
  const [title, setTitle] = useState(step.title);
  const [estimate, setEstimate] = useState(String(step.estimateMinutes));
  const titleRef = useRef<HTMLInputElement | null>(null);

  const updateStep = useUpdateStep();
  const deleteStep = useDeleteStep();

  useEffect(() => {
    // Re-sync local state if the server-side step changes (refetch, drag, …).
    setTitle(step.title);
    setEstimate(String(step.estimateMinutes));
  }, [step.title, step.estimateMinutes]);

  useEffect(() => {
    if (autoFocus && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
      onAutoFocused();
    }
  }, [autoFocus, onAutoFocused]);

  const completed = step.completedAt !== null;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: step.id });

  function commitTitle() {
    const trimmed = title.trim();
    if (trimmed.length === 0) {
      setTitle(step.title); // revert
      return;
    }
    if (trimmed === step.title) return;
    updateStep.mutate({ choreId, stepId: step.id, input: { title: trimmed } });
  }

  function commitEstimate() {
    const num = Number(estimate);
    if (!Number.isInteger(num) || num < 1 || num > 240) {
      setEstimate(String(step.estimateMinutes)); // revert
      return;
    }
    if (num === step.estimateMinutes) return;
    updateStep.mutate({
      choreId,
      stepId: step.id,
      input: { estimateMinutes: num },
    });
  }

  function toggleCompleted() {
    updateStep.mutate({
      choreId,
      stepId: step.id,
      input: { completed: !completed },
    });
  }

  function remove() {
    deleteStep.mutate({ choreId, stepId: step.id });
  }

  return (
    <Box
      ref={setNodeRef}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        opacity: isDragging ? 0.5 : completed ? 0.55 : 1,
        transform: CSS.Transform.toString(transform),
        transition,
        bgcolor: "rgba(0,0,0,0.02)",
        borderRadius: 1,
        px: 0.5,
      }}
    >
      <Checkbox
        size="small"
        checked={completed}
        onChange={toggleCompleted}
        disabled={updateStep.isPending}
        sx={{ p: 0.5 }}
      />
      <TextField
        inputRef={titleRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={commitTitle}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            (e.target as HTMLInputElement).blur();
          }
        }}
        variant="standard"
        size="small"
        sx={{
          flexGrow: 1,
          "& .MuiInput-input": {
            textDecoration: completed ? "line-through" : "none",
          },
        }}
        slotProps={{ input: { disableUnderline: true } }}
      />
      <TextField
        value={estimate}
        type="number"
        onChange={(e) => setEstimate(e.target.value)}
        onBlur={commitEstimate}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            (e.target as HTMLInputElement).blur();
          }
        }}
        variant="standard"
        size="small"
        sx={{ width: 48 }}
        slotProps={{
          input: { disableUnderline: true },
          htmlInput: { min: 1, max: 240, style: { textAlign: "right" } },
        }}
      />
      <IconButton
        size="small"
        aria-label="Drag step"
        {...attributes}
        {...listeners}
        sx={{ cursor: "grab", p: 0.5 }}
      >
        <DragIndicatorIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        aria-label="Delete step"
        onClick={remove}
        disabled={deleteStep.isPending}
        sx={{ p: 0.5 }}
      >
        <DeleteIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}
