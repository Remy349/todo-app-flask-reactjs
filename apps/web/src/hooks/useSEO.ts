import { useEffect } from "react";

export const useSEO = (title: string) => {
  useEffect(() => {
    document.title = title;
  }, [title]);
};
