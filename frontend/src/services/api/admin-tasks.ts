import { useAuthStore } from "@/stores/auth-store";
import { AdminTask } from "@/types/types";
import axios from "axios";

export const getAdminTasksAPI = async () => {
  const token = useAuthStore.getState().token;

  const response = await axios.get<AdminTask[]>(
    "http://localhost:5000/api/v1/tasks",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return response.data;
};
