import axios from "axios";
import { env } from "@/config/env.js";

const isHtmlResponse = (data) =>
  typeof data === "string" && /^\s*(<!doctype html|<html)/i.test(data);

export const getApiErrorMessage = (error) => {
  const data = error?.response?.data;
  if (typeof data === "string") return data;
  if (data?.Message) return data.Message;
  if (data?.message) return data.message;
  if (data?.Error) return data.Error;
  if (data?.error) return data.error;
  if (data?.title) return data.title;
  if (error?.response?.status === 401) return "Session expired or unauthorized. Please login again.";
  if (error?.message === "Network Error") return "Backend is not reachable. Please check API connection or Vite proxy.";
  if (error?.message) return error.message;
  return "Something went wrong. Please try again.";
};

const apiClient = axios.create({
  baseURL: env.useDevProxy ? "" : env.apiBaseUrl,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (import.meta.env.DEV) {
    console.log("API request:", {
      url: config.url,
      method: config.method,
      hasToken: Boolean(token),
    });
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    if (!isHtmlResponse(response.data)) return response;
    return Promise.reject(new Error("Backend returned HTML instead of JSON. Check API base URL or proxy."));
  },
  (error) => {
    if (isHtmlResponse(error.response?.data)) {
      error.response.data = { message: "Backend returned HTML instead of JSON. Check API base URL or proxy." };
    }
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("role");
      if (window.location.pathname !== "/login") window.location.assign("/login");
    }
    return Promise.reject(error);
  },
);

export default apiClient;
