import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Imported from JS rather than linked in index.html so Vite rewrites the woff2
// url() with the configured `base`. An absolute @font-face path would 404 on
// GitHub Pages, which serves the app from /MonthlyTransactionReportAnalysis/.
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
