import { useQuery } from "@tanstack/react-query";
import { getUsersAPI } from "../api/users";

export const useGetUsersQuery = () => {
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: getUsersAPI,
  });
};
