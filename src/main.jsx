import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/space-grotesk/latin-400.css";
import "@fontsource/space-grotesk/latin-500.css";
import "@fontsource/space-grotesk/latin-600.css";
import "@fontsource/space-grotesk/latin-700.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import DeviceGate from "./offline/DeviceGate";
import "./styles/globals.css";
import { APP_TITLE } from "./config/branding";

document.title = APP_TITLE;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <DeviceGate />
  </React.StrictMode>
);
