import apiClient from "../../../api/axios";
import { apiEndpoints } from "../../../api/apiEndpoints";
import { env } from "../../../config/env";
import { loginWithMockCredentials } from "./mockAuthService";

export const loginUser = (data) => {
  if (env.enableMockAuth) return loginWithMockCredentials(data);
  return apiClient.post(apiEndpoints.auth.login, data);
};
export const registerUser = (data) => apiClient.post(apiEndpoints.auth.register, data);
export const forgotPassword = (data) =>
  apiClient.post(apiEndpoints.auth.forgotPassword, data);
export const verifyOtp = (data) => apiClient.post(apiEndpoints.auth.verifyOtp, data);
export const resetPassword = (data) =>
  apiClient.post(apiEndpoints.auth.resetPassword, data);
export const getUsers = () => apiClient.get(apiEndpoints.auth.users);
export const getUserById = (id) => apiClient.get(apiEndpoints.auth.user(id));
