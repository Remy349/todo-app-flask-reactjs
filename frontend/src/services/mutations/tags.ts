import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTagAPI } from "../api/tags";

export const useCreateTagMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTagAPI,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });
};
