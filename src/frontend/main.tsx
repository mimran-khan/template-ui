import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./global.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
    <BrowserRouter basename={window.APP_DATA?.basePath || "/"}>
      <App />
    </BrowserRouter>
);
