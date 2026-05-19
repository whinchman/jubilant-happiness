import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceptBreakdown,
  createTask,
  deleteTask,
  fetchAreas,
  fetchAuthStatus,
  fetchBoard,
  fetchGetStartedSession,
  login,
  logout,
  moveTask,
  requestBreakdown,
  setupAccount,
  updateTask,
  type MoveTaskInput,
  type UpdateTaskInput,
} from "@todoer/shared";

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

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) =>
      updateTask(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["board"] });
      void qc.invalidateQueries({ queryKey: ["areas"] });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["board"] });
    },
  });
}

export function useMoveTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: MoveTaskInput }) =>
      moveTask(id, input),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["board"] });
    },
  });
}

export function useBreakdown() {
  return useMutation({ mutationFn: requestBreakdown });
}

export function useAcceptBreakdown() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: acceptBreakdown,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["board"] });
      void qc.invalidateQueries({ queryKey: ["areas"] });
    },
  });
}

export function useGetStartedSession() {
  return useQuery({
    queryKey: ["focusSession"],
    queryFn: fetchGetStartedSession,
    gcTime: 0,
    staleTime: Infinity,
  });
}

export function useAuthStatus() {
  return useQuery({ queryKey: ["authStatus"], queryFn: fetchAuthStatus });
}

export function useSetup() {
  return useMutation({ mutationFn: setupAccount });
}

export function useLogin() {
  return useMutation({ mutationFn: login });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSuccess: () => qc.clear(),
  });
}
