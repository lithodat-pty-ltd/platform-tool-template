import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SandboxHost } from "./SandboxHost";
import "./sandbox.css";

const root = document.getElementById("root");
if (!root) throw new Error("Sandbox root was not found.");

createRoot(root).render(
  <StrictMode>
    <SandboxHost />
  </StrictMode>,
);
