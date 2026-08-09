export const apiEndpoints = {
  admin: {
    login: "/api/Admin/login",
    create: "/api/Admin",
    getAll: "/api/Admin",
    getById: (adminId) => `/api/Admin/${adminId}`,
    changePassword: "/api/Admin/change-password",
    updateStatus: (adminId) => `/api/Admin/${adminId}/status`,
  },
  assignments: {
    list: "/api/v1/assignments",
    create: "/api/v1/assignments",
    details: (id) => `/api/v1/assignments/${id}`,
    update: (id) => `/api/v1/assignments/${id}`,
    delete: (id) => `/api/v1/assignments/${id}`,
    submit: (id) => `/api/v1/assignments/${id}/submit`,
    subjectsByGroup: (groupId) => `/api/v1/assignments/groups/${groupId}/subjects`,
    submissions: (id) => `/api/v1/assignments/${id}/submissions`,
  },
  faculty: {
    list: "/api/v1/faculty",
  },
  academicYears: {
    list: "/api/v1/academic-years",
  },
  groups: {
    list: "/api/v1/groups",
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
