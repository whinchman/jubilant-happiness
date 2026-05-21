import { useMutation } from "@tanstack/react-query";
import { generatePackingKit } from "@todoer/shared";

export function usePackingGenerator() {
  return useMutation({ mutationFn: generatePackingKit });
}
