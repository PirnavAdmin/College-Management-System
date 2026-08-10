import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";

const ADMIN_EMAIL = "admin@cms.com";

export const adminLogin = (data) =>
  apiClient.post(apiEndpoints.admin.login, {
    email: data.email,
    password: data.password,
  });

export const userLogin = (data) =>
  apiClient.post(apiEndpoints.auth.login, {
    emailOrMobile: data.emailOrMobile,
    password: data.password,
  });

export const loginUser = async (credentials) => {
  const emailOrMobile = String(credentials.emailOrMobile || "").trim();
  const password = credentials.password;
  const isAdminLogin = emailOrMobile.toLowerCase() === ADMIN_EMAIL;

  if (isAdminLogin) {
    logLoginSelection(apiEndpoints.admin.login, emailOrMobile);
    try {
      const response = await adminLogin({ email: emailOrMobile, password });
      logLoginResponse(response.status);
      return normalizeLoginResponse(response.data, emailOrMobile, "admin");
    } catch (error) {
      throw buildLoginError(error, apiEndpoints.admin.login);
    }
  }

  logLoginSelection(apiEndpoints.auth.login, emailOrMobile);
  try {
    const response = await userLogin({ emailOrMobile, password });
    logLoginResponse(response.status);
    return normalizeLoginResponse(response.data, emailOrMobile);
  } catch (error) {
    throw buildLoginError(error, apiEndpoints.auth.login);
  }
};

export const registerUser = (data) => apiClient.post(apiEndpoints.auth.register, data);
export const forgotPassword = (data) => apiClient.post(apiEndpoints.auth.forgotPassword, data);
export const verifyOtp = (data) => apiClient.post(apiEndpoints.auth.verifyOtp, data);
export const resetPassword = (data) => apiClient.post(apiEndpoints.auth.resetPassword, data);
export const getUsers = () => apiClient.get(apiEndpoints.auth.users);
export const getUserById = (id) => apiClient.get(apiEndpoints.auth.userById(id));

function normalizeLoginResponse(payload = {}, enteredEmail, fallbackRole = "student") {
  const data = getData(payload);
  assertSuccessful(payload, data);

  const token = normalizeToken(getToken(payload, data));
  const role = data.Role || data.role || payload.Role || payload.role || fallbackRole;
  const normalizedRole = String(role).trim().toLowerCase();
  const user = {
    id: data.AdminId || data.adminId || data.UserId || data.userId || data.id || data.Id || payload.AdminId || payload.adminId || payload.UserId || payload.userId || payload.id || payload.Id,
    name: data.Name || data.name || data.fullName || payload.Name || payload.name || payload.fullName || "CMS User",
    email: data.email || data.Email || payload.email || payload.Email || enteredEmail,
    role,
    isAdmin: normalizedRole === "admin" || normalizedRole === "super admin",
  };

  return {
    token,
    user,
    roleType: user.isAdmin ? "admin" : "student",
    message: getMessage(payload, data, "Login successful."),
  };
}

function getData(payload) {
  return payload?.data || payload?.Data || payload || {};
}

function getMessage(payload, data, fallback) {
  return payload?.message || payload?.Message || data?.message || data?.Message || fallback;
}

function assertSuccessful(payload, data) {
  const status = payload?.status ?? payload?.Status ?? data?.status ?? data?.Status;
  if (status === false) {
    throw new Error(getMessage(payload, data, "Invalid login credentials."));
  }
}

function getToken(payload, data) {
  return (
    payload?.AccessToken ||
    payload?.accessToken ||
    payload?.Token ||
    payload?.token ||
    payload?.jwt ||
    data?.AccessToken ||
    data?.accessToken ||
    data?.Token ||
    data?.token ||
    data?.jwt
  );
}

function normalizeToken(token) {
  return token ? String(token).replace(/^Bearer\s+/i, "").trim() : "";
}

function buildLoginError(error, endpoint) {
  const status = error?.response?.status;
  if (endpoint === apiEndpoints.admin.login && status === 500) {
    return new Error("Admin login API failed on server. Please check backend /api/Admin/login.");
  }
  if (status === 401) {
    return new Error("Invalid email/mobile or password.");
  }

  const message = getBackendMessage(error) || "Login failed. Please try again.";
  return new Error(message);
}

function getBackendMessage(error) {
  const data = error?.response?.data;
  if (typeof data === "string") return data;
  return data?.Message || data?.message || data?.title || error?.message;
}

function logLoginSelection(endpoint, emailOrMobile) {
  if (!import.meta.env.DEV) return;
  console.log("Login selected endpoint:", endpoint);
  console.log("Login email/mobile:", emailOrMobile);
}

function logLoginResponse(status) {
  if (!import.meta.env.DEV) return;
  console.log("Login response status:", status);
}
