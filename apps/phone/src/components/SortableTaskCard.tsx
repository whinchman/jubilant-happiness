import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ChoreWithSteps } from "@todoer/shared";
import { TaskCard } from "./TaskCard";

interface SortableTaskCardProps {
  chore: ChoreWithSteps;
  onClick?: () => void;
}

export function SortableTaskCard({ chore, onClick }: SortableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: chore.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        cursor: "grab",
      }}
      {...attributes}
      {...listeners}
    >
      <TaskCard chore={chore} onClick={onClick} />
    </div>
  );
}
