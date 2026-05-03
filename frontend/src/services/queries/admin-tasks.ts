import { useQuery } from "@tanstack/react-query";
import { getAdminTasksAPI } from "../api/admin-tasks";

export const useGetAdminTasksQuery = () => {
  return useQuery({
    queryKey: ["admin-tasks"],
    queryFn: getAdminTasksAPI,
  });
};
