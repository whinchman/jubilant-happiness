import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import { Sticker } from "./Chrome";
import { display, ink, mono } from "../theme";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmColor?: "error" | "primary";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Punky confirmation dialog — used for task deletion and focus-run abandons. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  confirmColor = "primary",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onCancel}
      maxWidth="xs"
      fullWidth
    >
      <Box sx={{ p: 2, pb: 0 }}>
        <Sticker color={confirmColor === "error" ? "pink" : "yellow"} rotate={-2} size="sm">
          {confirmColor === "error" ? "are you sure?" : "confirm"}
        </Sticker>
      </Box>
      <DialogTitle
        sx={{
          fontFamily: display,
          fontWeight: 900,
          fontSize: 26,
          textTransform: "uppercase",
          letterSpacing: "-0.01em",
          color: ink,
        }}
      >
        {title}
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ fontFamily: mono, fontSize: 13, lineHeight: 1.5, color: ink }}>
          {message}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onCancel} disabled={busy} variant="outlined" sx={{ py: 1.25 }}>
          cancel
        </Button>
        <Button
          onClick={onConfirm}
          color={confirmColor}
          variant="contained"
          disabled={busy}
          sx={{ py: 1.25 }}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
