import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { store } from "./store";
import { ToastProvider } from "./components/ui/Toast";
import App from "./App";
import "./index.css";

// Clear any stale focus-mode flag from previous sessions
try {
  localStorage.removeItem("streamora_focus_mode");
} catch {
  /* ignore */
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      staleTime: 60_000,
      gcTime: 10 * 60_000,
    },
  },
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
          <ToastProvider />
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  </StrictMode>,
);
