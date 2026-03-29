import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/global.css";
import { ColourBlindProvider } from "./context/ColourBlindContext";

// Apply persisted dark mode before first render to avoid flash
if (localStorage.getItem('tradeup_dark_mode') === 'true') {
  document.documentElement.classList.add('dark');
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ColourBlindProvider>
      <App />
    </ColourBlindProvider>
  </React.StrictMode>
);
