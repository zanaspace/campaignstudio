import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import App from "./App.tsx"; // explicit: the old App.jsx still sits beside it
import { loadAndPersist } from "./persist";
import { restoreSessionUser } from "@/lib/studio/access";

// Load data saved in this browser before the first render, then keep saving changes.
loadAndPersist();
restoreSessionUser();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
