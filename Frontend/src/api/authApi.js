import api from "./axios";

export const registerUser = (data) => api.post("/api/auth/register", data);

export const loginUser = (data) => api.post("/api/auth/login", data);

export const forgotPassword = (data) =>
  api.post("/api/auth/forgot-password", data);

export const verifyOtp = (data) => api.post("/api/auth/verify-otp", data);

export const resetPassword = (data) =>
  api.post("/api/auth/reset-password", data);
