import axios from "axios";
import { env } from "@/config/env.js";

const isHtmlResponse = (data) =>
  typeof data === "string" && /^\s*(<!doctype html|<html)/i.test(data);

const getStoredAccessToken = () => {
  const stored = localStorage.getItem("token");
  if (!stored) return "";
  return stored.replace(/^Bearer\s+/i, "").trim();
};

const getJwtExpiryState = (token) => {
  try {
    const [, payload] = token.split(".");
    if (!payload) return { isJwt: false };
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(window.atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")));
    if (!decoded.exp) return { isJwt: true, isExpired: false };
    return { isJwt: true, isExpired: decoded.exp * 1000 <= Date.now() };
  } catch {
    return { isJwt: false };
  }
};

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
  const token = getStoredAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (import.meta.env.DEV) {
    const expiry = token ? getJwtExpiryState(token) : {};
    console.log("API request:", {
      url: config.url,
      method: config.method,
      hasToken: Boolean(token),
      tokenLength: token.length || 0,
      hasBearer: Boolean(config.headers?.Authorization?.startsWith("Bearer ")),
      tokenExpired: expiry.isJwt ? expiry.isExpired : undefined,
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
      const currentData = error.response.data;
      error.response.data = {
        ...(currentData && typeof currentData === "object" ? currentData : {}),
        message: getApiErrorMessage(error) || "Session expired or unauthorized. Please login again.",
      };
    }
    return Promise.reject(error);
  },
);

export default apiClient;

