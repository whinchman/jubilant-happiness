import RepeatIcon from "@mui/icons-material/Repeat";
import { Box, Card, CardContent, Chip, Typography } from "@mui/material";
import type { Task } from "@todoer/shared";

export function TaskCard({ task }: { task: Task }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
          {task.title}
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, alignItems: "center" }}>
          <Chip label={`${task.estimateMinutes} min`} size="small" />
          {task.area && (
            <Chip label={task.area} size="small" color="primary" variant="outlined" />
          )}
          {task.isRepeating && (
            <RepeatIcon fontSize="small" sx={{ color: "text.secondary", ml: "auto" }} />
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
