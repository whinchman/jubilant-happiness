import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTask, fetchAreas, fetchBoard } from "@todoer/shared";

export function useBoard() {
  return useQuery({ queryKey: ["board"], queryFn: fetchBoard });
}

export function useAreas() {
  return useQuery({ queryKey: ["areas"], queryFn: fetchAreas });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["board"] });
      void qc.invalidateQueries({ queryKey: ["areas"] });
    },
  });
}
