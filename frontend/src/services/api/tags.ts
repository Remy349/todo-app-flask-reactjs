import { Tag } from "@/types/types";
import { useAuthStore } from "@/stores/auth-store";
import axios from "axios";

export const getTagsAPI = async () => {
  const response = await axios.get<Tag[]>("http://localhost:5000/api/v1/tags");

  return response.data;
};

export const createTagAPI = async (name: string) => {
  const token = useAuthStore.getState().token;

  await axios.post(
    "http://localhost:5000/api/v1/tags",
    { name },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
};
