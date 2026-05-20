import {
  LANES,
  type Board,
  type Lane,
  type MoveTaskInput,
  type Task,
} from "@todoer/shared";

export function isLane(id: string): id is Lane {
  return (LANES as readonly string[]).includes(id);
}

export function findLane(board: Board, taskId: string): Lane | null {
  for (const lane of LANES) {
    if (board[lane].some((t) => t.id === taskId)) return lane;
  }
  return null;
}

export function findTaskInBoard(board: Board, taskId: string): Task | null {
  for (const lane of LANES) {
    const found = board[lane].find((t) => t.id === taskId);
    if (found) return found;
  }
  return null;
}

export interface PlannedMove {
  board: Board;
  input: MoveTaskInput;
}

/**
 * Given a drag of `activeId` (currently in `fromLane`) dropped over `overId` —
 * a sibling task id, or a lane id when dropped on empty lane space — returns the
 * reordered board and the move payload (an afterId/beforeId anchor for the API).
 */
export function computeMove(
  board: Board,
  activeId: string,
  fromLane: Lane,
  toLane: Lane,
  overId: string,
): PlannedMove | null {
  const activeTask = board[fromLane].find((t) => t.id === activeId);
  if (!activeTask) return null;

  const sourceWithout = board[fromLane].filter((t) => t.id !== activeId);
  const destWithout = toLane === fromLane ? sourceWithout : board[toLane];

  let insertAt: number;
  if (isLane(overId)) {
    insertAt = destWithout.length;
  } else {
    const overIndex = destWithout.findIndex((t) => t.id === overId);
    insertAt = overIndex === -1 ? destWithout.length : overIndex;
  }

  const movedTask: Task = { ...activeTask, lane: toLane };
  const destWith = [
    ...destWithout.slice(0, insertAt),
    movedTask,
    ...destWithout.slice(insertAt),
  ];

  const predecessor = destWith[insertAt - 1];
  const successor = destWith[insertAt + 1];
  const input: MoveTaskInput = predecessor
    ? { lane: toLane, afterId: predecessor.id }
    : successor
      ? { lane: toLane, beforeId: successor.id }
      : { lane: toLane };

  const nextBoard: Board = {
    ready: board.ready,
    doing: board.doing,
    done: board.done,
  };
  nextBoard[fromLane] = sourceWithout;
  nextBoard[toLane] = destWith;

  return { board: nextBoard, input };
}
