import { useQuery } from "@tanstack/react-query";
import { getTasksOnUserAPI } from "../api/tasks";

export const useGetTasksOnUserQuery = () => {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: getTasksOnUserAPI,
  });
};
