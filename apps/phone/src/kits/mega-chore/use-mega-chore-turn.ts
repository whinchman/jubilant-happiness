import { useMutation } from "@tanstack/react-query";
import { postMegaChoreTurn } from "@todoer/shared";

export function useMegaChoreTurn() {
  return useMutation({ mutationFn: postMegaChoreTurn });
}
