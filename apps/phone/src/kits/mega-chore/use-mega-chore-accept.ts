import { useMutation, useQueryClient } from "@tanstack/react-query";
import { acceptMegaChoreBreakdown } from "@todoer/shared";

export function useMegaChoreAccept() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: acceptMegaChoreBreakdown,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["board"] });
      void qc.invalidateQueries({ queryKey: ["areas"] });
    },
  });
}
