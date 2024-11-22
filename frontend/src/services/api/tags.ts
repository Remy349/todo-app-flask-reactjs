import { Tag } from "@/types/types";
import axios from "axios";

export const getTagsAPI = async () => {
  const response = await axios.get<Tag[]>("http://localhost:5000/api/v1/tags");

  return response.data;
};
