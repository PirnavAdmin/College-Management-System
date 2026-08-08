# Pirnav Junior College CMS Frontend

React + Vite frontend for the Pirnav Junior College Management System. This version keeps the completed Frontendnew dashboard UI/design while replacing the TanStack Start/TypeScript runtime with a clean JavaScript + JSX Vite + React Router structure.

## Tech Stack

- React 19
- Vite
- React Router
- Axios
- Plain CSS through `src/cms.css`
- Recharts and Lucide React for the existing dashboard visuals

## Environment

Create one local `.env` file using `.env.example`:

```env
VITE_API_BASE_URL=https://heroics-ambush-baton.ngrok-free.dev
VITE_USE_DEV_PROXY=true
```

When `VITE_USE_DEV_PROXY=true`, the browser calls `/api/...` and Vite proxies requests to `VITE_API_BASE_URL`. Restart `npm run dev` after changing `.env` or `vite.config.js`.

## Commands

```bash
npm install
npm run dev
npm run lint
npm run build
```

## Structure

```text
src/
  app/                 Vite app entry and root App component
  api/                 Axios client and API endpoint constants
  assets/              Images, including P_LOGO.png
  config/              Environment and module configuration
  features/auth/       Login, register, password pages, auth service
  layouts/             Shared AuthLayout
  routes/              React Router routes and route guards
  Dashboard/           Student dashboard and dashboard-specific areas
  components/          Preserved Frontendnew designed UI/pages/layout
  data/                Existing static module data for UI-only modules
  hooks/               Theme/sidebar state hooks
  cms.css              Main plain CSS design system
  styles.css           CSS entry importing cms.css
```

## Authentication

- Admin login first calls `POST /api/Admin/login`.
- If admin login fails, normal user login calls `POST /api/Auth/login`.
- Register calls `POST /api/Auth/register`.
- Register no longer shows a role field.
- All registrations send `role: "student"`.
- Tokens are stored in `localStorage.token`.
- The user object is stored in `localStorage.user`.
- The role is stored in `localStorage.role`.

Admin users are redirected to `/dashboard`. Student users are redirected to `/student-dashboard`.

## Routes

Public:

- `/`
- `/login`
- `/register`
- `/forgot-password`
- `/verify-otp`
- `/reset-password`

Admin only:

- `/dashboard`
- `/dashboard/boards`
- `/dashboard/academic-years`
- `/dashboard/courses`
- `/dashboard/subjects`
- `/dashboard/sections`
- `/dashboard/faculty`
- `/dashboard/faculty-allocation`
- `/dashboard/admission`
- `/dashboard/students`
- `/dashboard/timetable`
- `/dashboard/attendance`
- `/dashboard/assignments`
- `/dashboard/examinations`
- `/dashboard/marks-entry`
- `/dashboard/results`
- `/dashboard/promotion`
- `/dashboard/fee-structure`
- `/dashboard/certificates`
- `/dashboard/reports`

Student only:

- `/student-dashboard`

## Module API Status

Only authentication is integrated now. Existing module pages keep the Frontendnew static UI/data so the design remains intact. Module API integration can be added later inside service files without changing the dashboard UI structure.

## Branding

The app uses `src/assets/P_LOGO.png` and the visible college name is `Pirnav Junior College`.

## Team Rules

- Use JavaScript and JSX only.
- Do not add `.ts` or `.tsx` source files.
- Do not call Axios directly from components; add service functions.
- Keep API paths in `src/api/apiEndpoints.js`.
- Keep backend base URL in `.env` only.
- Keep route changes in `src/routes/AppRoutes.jsx`.
- Keep shared styling in `src/cms.css` unless a feature needs scoped CSS.
- Do not commit `node_modules`, `dist`, or `.env`.
