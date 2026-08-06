import apiClient from "../../../api/axios";
import { apiEndpoints } from "../../../api/apiEndpoints";

export const adminLogin = (data) =>
  apiClient.post(apiEndpoints.admin.login, {
    email: data.emailOrMobile,
    emailOrMobile: data.emailOrMobile,
    password: data.password,
  });

export const userLogin = (data) =>
  apiClient.post(apiEndpoints.auth.login, {
    emailOrMobile: data.emailOrMobile,
    password: data.password,
  });

export const loginUser = async (data) => {
  let adminError;
  try {
    const adminResponse = await adminLogin(data);
    return normalizeLoginResponse(adminResponse.data, data.emailOrMobile, "admin");
  } catch (error) {
    adminError = error;
  }

  try {
    const userResponse = await userLogin(data);
    return normalizeLoginResponse(userResponse.data, data.emailOrMobile, "student");
  } catch (userError) {
    throw buildLoginError(userError, adminError);
  }
};

export const registerUser = (data) => apiClient.post(apiEndpoints.auth.register, data);
export const forgotPassword = (data) =>
  apiClient.post(apiEndpoints.auth.forgotPassword, data);
export const verifyOtp = (data) => apiClient.post(apiEndpoints.auth.verifyOtp, data);
export const resetPassword = (data) =>
  apiClient.post(apiEndpoints.auth.resetPassword, data);
export const getUsers = () => apiClient.get(apiEndpoints.auth.users);
export const getUserById = (id) => apiClient.get(apiEndpoints.auth.userById(id));

function normalizeLoginResponse(payload = {}, enteredEmail, fallbackRole) {
  const data = payload.data || payload.Data || payload;
  const status = payload.status ?? payload.Status ?? data.status ?? data.Status;
  const message = payload.message || payload.Message || data.message || data.Message || "Login successful.";

  if (status === false) {
    throw new Error(message || "Invalid login credentials.");
  }

  const token =
    payload.AccessToken ||
    payload.accessToken ||
    payload.Token ||
    payload.token ||
    payload.jwt ||
    data.AccessToken ||
    data.accessToken ||
    data.Token ||
    data.token ||
    data.jwt;

  const role = fallbackRole === "admin" ? "admin" : data.Role || data.role || payload.Role || payload.role || "student";
  const isAdmin = role === "admin" || fallbackRole === "admin";
  const user = isAdmin
    ? {
        id: data.id || data.adminId || data.AdminId || data.UserId || payload.id || payload.UserId,
        name: data.name || data.Name || payload.name || payload.Name || "CMS Admin",
        email: data.email || data.Email || payload.email || payload.Email || enteredEmail,
        role: "admin",
        isAdmin: true,
      }
    : {
        id: data.UserId || data.userId || data.id || payload.UserId || payload.userId || payload.id,
        name: data.Name || data.name || data.fullName || payload.Name || payload.name || payload.fullName || "CMS User",
        email: data.email || data.Email || payload.email || payload.Email || enteredEmail,
        role,
        isAdmin: false,
      };

  return {
    token,
    user,
    roleType: isAdmin ? "admin" : "student",
    message,
  };
}

function buildLoginError(userError, adminError) {
  const message = getBackendMessage(userError) || getBackendMessage(adminError) || "Invalid credentials or login failed.";
  return new Error(message);
}

function getBackendMessage(error) {
  const data = error?.response?.data;
  if (typeof data === "string") return data;
  return data?.Message || data?.message || data?.title || error?.message;
}
