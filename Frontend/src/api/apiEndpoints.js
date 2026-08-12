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
  results: {
    list: "/api/v1/results",
    process: "/api/v1/results/process",
    publish: "/api/v1/results/publish",
    byStudent: (studentId) => `/api/v1/results/students/${studentId}`,
    rankList: "/api/v1/results/rank-list",
    failedStudents: "/api/v1/results/failed-students",
    statistics: "/api/v1/results/statistics",
    analysis: "/api/v1/results/analysis",
    memo: (studentId) => `/api/v1/results/memo/${studentId}`,
    revaluation: "/api/v1/results/revaluation",
    revaluationById: (revaluationId) => `/api/v1/results/revaluation/${revaluationId}`,
  },
  boards: {
    list: "/api/v1/boards",
  },
  groups: {
    list: "/api/v1/groups",
  },
};


