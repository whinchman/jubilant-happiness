import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ChoreWithSteps, Lane } from "@todoer/shared";
import { TaskCard } from "./TaskCard";

interface SortableTaskCardProps {
  chore: ChoreWithSteps;
  onClick?: () => void;
  lane?: Lane;
}

export function SortableTaskCard({ chore, onClick, lane }: SortableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: chore.id, disabled: chore.isBlocked === true });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1,
        cursor: chore.isBlocked ? "default" : "grab",
        touchAction: "manipulation",
      }}
      {...attributes}
      {...listeners}
    >
      <TaskCard chore={chore} onClick={onClick} lane={lane} />
    </div>
  );
}
