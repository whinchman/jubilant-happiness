import {
  LANES,
  type Board,
  type ChoreWithSteps,
  type Lane,
  type MoveTaskInput,
} from "@todoer/shared";

export function isLane(id: string): id is Lane {
  return (LANES as readonly string[]).includes(id);
}

export function findLane(board: Board, choreId: string): Lane | null {
  for (const lane of LANES) {
    if (board[lane].some((c) => c.id === choreId)) return lane;
  }
  return null;
}

export function findChoreInBoard(
  board: Board,
  choreId: string,
): ChoreWithSteps | null {
  for (const lane of LANES) {
    const found = board[lane].find((c) => c.id === choreId);
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
 * a sibling chore id, or a lane id when dropped on empty lane space — returns
 * the reordered board and the move payload (an afterId/beforeId anchor for the
 * API). Steps embedded in the moved chore are carried along untouched.
 */
export function computeMove(
  board: Board,
  activeId: string,
  fromLane: Lane,
  toLane: Lane,
  overId: string,
): PlannedMove | null {
  const activeChore = board[fromLane].find((c) => c.id === activeId);
  if (!activeChore) return null;

  const sourceWithout = board[fromLane].filter((c) => c.id !== activeId);
  const destWithout = toLane === fromLane ? sourceWithout : board[toLane];

  let insertAt: number;
  if (isLane(overId)) {
    insertAt = destWithout.length;
  } else {
    const overIndex = destWithout.findIndex((c) => c.id === overId);
    insertAt = overIndex === -1 ? destWithout.length : overIndex;
  }

  const movedChore: ChoreWithSteps = { ...activeChore, lane: toLane };
  const destWith = [
    ...destWithout.slice(0, insertAt),
    movedChore,
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
