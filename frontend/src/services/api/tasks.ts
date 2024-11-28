import { useAuthStore } from "@/stores/auth-store";
import { Task } from "@/types/types";
import axios from "axios";

export const getTasksOnUserAPI = async () => {
  const token = useAuthStore.getState().token;

  const response = await axios.get<Task[]>(
    "http://localhost:5000/api/v1/tasks/user",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return response.data;
};
