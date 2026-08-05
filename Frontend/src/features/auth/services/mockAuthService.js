export const DEMO_EMAIL = "admin@cms.test";
export const DEMO_PASSWORD = "Admin@123";
export const DEMO_TOKEN = "cms-demo-token";

export const demoUser = {
  id: "demo-admin-001",
  name: "CMS Demo Admin",
  email: DEMO_EMAIL,
  role: "Super Admin",
  collegeName: "Intermediate College",
};

export const loginWithMockCredentials = async (data = {}) => {
  const email = data.email || data.emailOrMobile || data.username || "";
  const password = data.password || "";

  if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
    return {
      data: {
        token: DEMO_TOKEN,
        user: demoUser,
        message: "Demo login successful",
      },
    };
  }

  throw new Error("Invalid demo credentials. Use admin@cms.test / Admin@123");
};
