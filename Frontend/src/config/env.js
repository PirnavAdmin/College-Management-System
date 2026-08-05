export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "",
  useDevProxy: import.meta.env.VITE_USE_DEV_PROXY === "true",
  enableMockAuth: import.meta.env.VITE_ENABLE_MOCK_AUTH === "true",
};
