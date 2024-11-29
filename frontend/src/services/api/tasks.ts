import { TCreateFormSchema } from "@/schemas/task-schema";
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

export const createTaskAPI = async (data: {
  formData: TCreateFormSchema;
  token: string | null;
}) => {
  const { formData, token } = data;

  await axios.post("http://localhost:5000/api/v1/tasks", formData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};
