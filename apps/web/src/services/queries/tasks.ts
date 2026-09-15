import { useQuery } from "@tanstack/react-query";
import { getArchivedTasksOnUserAPI, getTasksOnUserAPI } from "../api/tasks";

export const useGetTasksOnUserQuery = () => {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: getTasksOnUserAPI,
  });
};

export const useGetArchivedTasksOnUserQuery = () => {
  return useQuery({
    queryKey: ["archivedTasks"],
    queryFn: getArchivedTasksOnUserAPI,
  });
};
