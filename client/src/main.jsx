// src/main.jsx (or your entry file shown)
import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { store } from "./store/store";
import "./i18n"; // add this at the top once
import theme from "./theme/Theme"; 
import { ThemeProvider } from "@mui/material/styles";
import App from "./App";
import "grapesjs/dist/css/grapes.min.css";
import "./styles/index.css";
import "./styles/tailwind.css";

/* ===================== NEW LOGIC =====================
 * - Create QueryClient once (outside render) for stability
 * - Optional: StrictMode kept; ThemeProvider remains the same
 * ==================================================== */
const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
);
