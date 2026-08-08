export const apiEndpoints = {
  admin: {
    login: "/api/Admin/login",
    create: "/api/Admin",
    getAll: "/api/Admin",
    getById: (adminId) => `/api/Admin/${adminId}`,
    changePassword: "/api/Admin/change-password",
    updateStatus: (adminId) => `/api/Admin/${adminId}/status`,
  },
  auth: {
    login: "/api/Auth/login",
    register: "/api/Auth/register",
    forgotPassword: "/api/Auth/forgot-password",
    verifyOtp: "/api/Auth/verify-otp",
    resetPassword: "/api/Auth/reset-password",
    users: "/api/Auth/users",
    userById: (id) => `/api/Auth/user/${id}`,
  },
};


