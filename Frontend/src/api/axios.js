// import axios from "axios";

// const BACKEND_URL = "https://chance-sulfide-blaming.ngrok-free.dev";

// const api = axios.create({
//   // Vite forwards this local path to the backend in development, avoiding CORS.
//   baseURL: import.meta.env.DEV ? "/api-proxy" : BACKEND_URL,
// });

// export default api;
import axios from "axios";
 
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "https://chance-sulfide-blaming.ngrok-free.dev",
});
 
const isHtmlResponse = (data) =>
  typeof data === "string" && /^\s*(<!doctype html|<html)/i.test(data);
 
api.interceptors.response.use(
  (response) => {
    if (!isHtmlResponse(response.data)) return response;
 
    response.data = {
      message:
        "Backend API returned an HTML error page. Check VITE_API_PROXY_TARGET in .env.local and restart the frontend dev server.",
    };
 
    return Promise.reject(
      new axios.AxiosError(
        response.data.message,
        "ERR_BAD_RESPONSE",
        response.config,
        response.request,
        response,
      ),
    );
  },
  (error) => {
    if (isHtmlResponse(error.response?.data)) {
      error.response.data = {
        message:
          "Backend API returned an HTML error page. Check VITE_API_PROXY_TARGET in .env.local and restart the frontend dev server.",
      };
    }
 
    return Promise.reject(error);
  },
);
 
export default api;
