import "./index.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Button } from "./components/ui/button";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Button>Click Me</Button>
  </StrictMode>,
);
