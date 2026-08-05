export const apiEndpoints = {
  auth: {
    login: "/api/Auth/login",
    register: "/api/Auth/register",
    forgotPassword: "/api/Auth/forgot-password",
    verifyOtp: "/api/Auth/verify-otp",
    resetPassword: "/api/Auth/reset-password",
    users: "/api/Auth/users",
    user: (id) => `/api/Auth/user/${id}`,
  },
};
