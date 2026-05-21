import { useEffect, useMemo, useRef, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { Sticker } from "./Chrome";
import {
  bg,
  bgCard,
  display,
  ink,
  inkDim,
  inkFaint,
  mono,
  pink,
} from "../theme";

interface EditTaskDialogProps {
  /** Chore being edited; passing `null` closes the dialog. */
  choreId: string | null;
  onClose: () => void;
}

export function EditTaskDialog({ choreId, onClose }: EditTaskDialogProps) {
  const board = useBoard();
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
        input: { title: "new step", estimateMinutes: 5 },
      },
      { onSuccess: (step) => setPendingFocusStepId(step.id) },
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
        <Box sx={{ p: 2, pb: 0 }}>
          <Sticker color="blue" rotate={-2} size="sm">
            edit_chore
          </Sticker>
        </Box>
        <DialogTitle
          sx={{
            fontFamily: display,
            fontWeight: 900,
            fontSize: 24,
            textTransform: "uppercase",
            letterSpacing: "-0.005em",
          }}
        >
          tweak the details
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
            />
            <TextField
              label="estimate (minutes)"
              value={estimate}
              type="number"
              onChange={(e) => setEstimate(e.target.value)}
              error={estimate !== "" && !estimateValid}
              helperText={
                estimate !== "" && !estimateValid ? "use 1–600 minutes" : " "
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
                <TextField {...params} label="area (optional)" />
              )}
            />
            <TextField
              label="notes"
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
              label={
                <Typography
                  sx={{
                    fontFamily: mono,
                    fontSize: 12,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: ink,
                  }}
                >
                  repeats weekly
                </Typography>
              }
            />
            {updateTask.isError && (
              <Alert severity="error">couldn't save changes.</Alert>
            )}
            {deleteTask.isError && (
              <Alert severity="error">couldn't delete the chore.</Alert>
            )}

            {chore && (
              <>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mt: 1 }}>
                  <Typography
                    sx={{
                      fontFamily: display,
                      fontWeight: 800,
                      fontSize: 18,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    steps
                  </Typography>
                  <Box sx={{ flexGrow: 1, borderTop: `2px dashed ${ink}` }} />
                  <Typography
                    sx={{
                      fontFamily: mono,
                      fontSize: 11,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: inkDim,
                    }}
                  >
                    {String(chore.steps.length).padStart(2, "0")}
                  </Typography>
                </Box>
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
                  variant="outlined"
                  sx={{ alignSelf: "flex-start" }}
                >
                  add step
                </Button>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions
          sx={{ justifyContent: "space-between", px: 3, pb: 2.5 }}
        >
          <Button
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setConfirmOpen(true)}
            disabled={busy}
            variant="outlined"
          >
            delete
          </Button>
          <Stack direction="row" spacing={1}>
            <Button onClick={handleClose} disabled={busy} variant="outlined">
              cancel
            </Button>
            <Button variant="contained" onClick={save} disabled={!canSave}>
              save
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        title="delete this chore?"
        message="all steps inside will also be deleted. this can't be undone."
        confirmLabel="delete it"
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
      <Typography
        sx={{
          fontFamily: mono,
          fontSize: 11.5,
          color: inkFaint,
          fontStyle: "italic",
          letterSpacing: "0.04em",
        }}
      >
        no steps yet — add one below.
      </Typography>
    );
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <SortableContext
        items={steps.map((s) => s.id)}
        strategy={verticalListSortingStrategy}
      >
        <Stack spacing={0.75}>
          {steps.map((step, idx) => (
            <StepRow
              key={step.id}
              step={step}
              choreId={choreId}
              index={idx}
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
  index: number;
  autoFocus: boolean;
  onAutoFocused: () => void;
}

function StepRow({ step, choreId, index, autoFocus, onAutoFocused }: StepRowProps) {
  const [title, setTitle] = useState(step.title);
  const [estimate, setEstimate] = useState(String(step.estimateMinutes));
  const [notesText, setNotesText] = useState(step.notes);
  const titleRef = useRef<HTMLInputElement | null>(null);

  const updateStep = useUpdateStep();
  const deleteStep = useDeleteStep();

  useEffect(() => {
    setTitle(step.title);
    setEstimate(String(step.estimateMinutes));
    setNotesText(step.notes);
  }, [step.title, step.estimateMinutes, step.notes]);

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
      setTitle(step.title);
      return;
    }
    if (trimmed === step.title) return;
    updateStep.mutate({ choreId, stepId: step.id, input: { title: trimmed } });
  }

  function commitEstimate() {
    const num = Number(estimate);
    if (!Number.isInteger(num) || num < 1 || num > 240) {
      setEstimate(String(step.estimateMinutes));
      return;
    }
    if (num === step.estimateMinutes) return;
    updateStep.mutate({
      choreId,
      stepId: step.id,
      input: { estimateMinutes: num },
    });
  }

  function commitNotes() {
    const trimmed = notesText.trim();
    if (trimmed === (step.notes ?? "")) return;
    updateStep.mutate({
      choreId,
      stepId: step.id,
      input: { notes: trimmed },
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
        opacity: isDragging ? 0.5 : 1,
        transform: CSS.Transform.toString(transform),
        transition,
        border: `2px solid ${ink}`,
        bgcolor: bgCard,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "stretch", gap: 0 }}>
        <Box
          sx={{
            bgcolor: completed ? bg : ink,
            color: completed ? inkFaint : bg,
            fontFamily: display,
            fontWeight: 800,
            fontSize: 14,
            px: 0.75,
            minWidth: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRight: `2px solid ${ink}`,
          }}
        >
          {String(index + 1).padStart(2, "0")}
        </Box>
        <IconButton
          size="small"
          onClick={toggleCompleted}
          disabled={updateStep.isPending}
          aria-label={completed ? "uncheck step" : "check step"}
          sx={{ borderRadius: 0, p: 0.5, color: ink, "&:hover": { color: pink } }}
        >
          {completed ? (
            <CheckBoxIcon fontSize="small" sx={{ color: pink }} />
          ) : (
            <CheckBoxOutlineBlankIcon fontSize="small" />
          )}
        </IconButton>
        <TextField
          inputRef={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          variant="standard"
          size="small"
          sx={{
            flexGrow: 1,
            alignSelf: "center",
            "& .MuiInput-input": {
              fontFamily: mono,
              fontSize: 13,
              textDecoration: completed ? "line-through" : "none",
              color: completed ? inkFaint : ink,
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
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          variant="standard"
          size="small"
          sx={{
            width: 42,
            alignSelf: "center",
            "& .MuiInput-input": {
              fontFamily: mono,
              fontSize: 12,
              textAlign: "right",
            },
          }}
          slotProps={{ input: { disableUnderline: true } }}
        />
        <Typography
          sx={{
            fontFamily: mono,
            fontSize: 10.5,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: inkDim,
            alignSelf: "center",
            mr: 0.5,
          }}
        >
          m
        </Typography>
        <IconButton
          size="small"
          aria-label="Drag step"
          {...attributes}
          {...listeners}
          sx={{
            cursor: "grab",
            borderRadius: 0,
            p: 0.5,
            borderLeft: `2px solid ${ink}`,
            "&:hover": { color: pink },
          }}
        >
          <DragIndicatorIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          aria-label="Delete step"
          onClick={remove}
          disabled={deleteStep.isPending}
          sx={{
            borderRadius: 0,
            p: 0.5,
            borderLeft: `2px solid ${ink}`,
            "&:hover": { color: pink },
          }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>
      <TextField
        value={notesText}
        onChange={(e) => setNotesText(e.target.value)}
        onBlur={commitNotes}
        placeholder="items / notes for this step"
        multiline
        size="small"
        fullWidth
        slotProps={{ input: { disableUnderline: true } }}
        variant="standard"
        sx={{
          borderTop: `2px solid ${ink}`,
          px: 1,
          py: 0.5,
          "& .MuiInput-input": {
            fontFamily: mono,
            fontSize: 11,
            color: inkDim,
            lineHeight: 1.35,
          },
        }}
      />
    </Box>
  );
}
