import { createRoot } from "react-dom/client";
import "@iframe-resizer/child";
import App from "./components/App";
import { CortexApi } from "@cortexapps/plugin-core";

import "./baseStyles.css"; // @import "tailwindcss";
import "@cortexapps/react-plugin-ui/index.css";

document.addEventListener("DOMContentLoaded", function () {
  // Subscribe to theme changes
  CortexApi.pluginInit();

  const container = document.getElementById("cortex-plugin-root");
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const root = createRoot(container!);
  root.render(<App />);
});