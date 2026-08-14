export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "https://cultivate-suitable-manmade.ngrok-free.dev",
  // Requests made from Vite's dev server should stay same-origin. Vite forwards
  // `/api` to the configured backend, avoiding browser CORS preflights (and the
  // ngrok warning-header preflight) altogether. This can still be overridden
  // when a direct backend request is specifically required.
  useDevProxy: import.meta.env.VITE_USE_DEV_PROXY
    ? import.meta.env.VITE_USE_DEV_PROXY === "true"
    : import.meta.env.DEV,
};


