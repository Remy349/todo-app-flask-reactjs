import axios from "axios";
import type { Tag } from "@/types/types";

export const getTagsAPI = async () => {
  const response = await axios.get<Tag[]>("http://localhost:5000/api/v1/tags");

  return response.data;
};
