import { TCreateFormSchema, TEditFormSchema } from "@/schemas/task-schema";
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

export const getArchivedTasksOnUserAPI = async () => {
  const token = useAuthStore.getState().token;

  const response = await axios.get<Task[]>(
    "http://localhost:5000/api/v1/tasks/user/archived",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return response.data;
};

export const toggleArchiveAPI = async (data: {
  taskId: number;
  token: string | null;
}) => {
  const { token, taskId } = data;

  await axios.patch(
    `http://localhost:5000/api/v1/tasks/${taskId}/toggle-archive`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
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

export const updateTaskAPI = async (data: {
  formData: TEditFormSchema;
  taskId: number;
  token: string | null;
}) => {
  const { formData, token, taskId } = data;

  await axios.put(`http://localhost:5000/api/v1/tasks/${taskId}`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

export const deleteTaskAPI = async (data: {
  taskId: number;
  token: string | null;
}) => {
  const { token, taskId } = data;

  await axios.delete(`http://localhost:5000/api/v1/tasks/${taskId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};
