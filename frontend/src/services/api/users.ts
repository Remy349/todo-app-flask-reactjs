import { useAuthStore } from "@/stores/auth-store";
import { User } from "@/types/types";
import axios from "axios";

export const getUsersAPI = async () => {
  const token = useAuthStore.getState().token;

  const response = await axios.get<User[]>("http://localhost:5000/api/v1/users", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

export const deleteUserAPI = async (userId: number) => {
  const token = useAuthStore.getState().token;

  await axios.delete(`http://localhost:5000/api/v1/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};
