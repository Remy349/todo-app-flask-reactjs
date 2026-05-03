import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteUserAPI } from "../api/users";

export const useDeleteUserMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteUserAPI,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
    },
  });
};
