import axios from "axios";
import { env } from "../config/env";

const isHtmlResponse = (data) =>
  typeof data === "string" && /^\s*(<!doctype html|<html)/i.test(data);

export const getApiErrorMessage = (error) => {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.response?.data?.title) return error.response.data.title;
  if (error?.message) return error.message;
  return "Something went wrong. Please try again.";
};

const api = axios.create({
  baseURL: env.useDevProxy ? "" : env.apiBaseUrl,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (!isHtmlResponse(response.data)) return response;
    return Promise.reject(
      new axios.AxiosError(
        "Backend returned an HTML page instead of JSON. Check the API base URL.",
        "ERR_BAD_RESPONSE",
        response.config,
        response.request,
        {
          ...response,
          data: {
            message:
              "Backend returned an HTML page instead of JSON. Check the API base URL.",
          },
        },
      ),
    );
  },
  (error) => {
    if (isHtmlResponse(error.response?.data)) {
      error.response.data = {
        message:
          "Backend returned an HTML page instead of JSON. Check the API base URL.",
      };
    }
    return Promise.reject(error);
  },
);

export default api;
