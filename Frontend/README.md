# College Management System

A Vite + React admin and student portal for an Intermediate College Management System.

## Tech Stack

- Vite
- React with JavaScript + JSX
- React Router
- Axios
- React Icons
- Normal CSS with CSS variables
- oxlint

## Install

```bash
npm install
```

## Run

```bash
npm run dev
```

## Environment

Create `.env` from `.env.example`.

```bash
VITE_API_BASE_URL=https://sterile-retorted-tightness.ngrok-free.dev
VITE_USE_DEV_PROXY=true
```

When `VITE_USE_DEV_PROXY=true`, axios uses same-origin `/api/...` URLs and Vite proxies them to `VITE_API_BASE_URL`.

## Local API Proxy / CORS Workaround

- Frontend calls `/api/...`, for example `/api/Admin/login` or `/api/v1/boards`.
- Vite proxies the request to `VITE_API_BASE_URL`.
- Restart `npm run dev` after changing `vite.config.js` or `.env`.
- Production backend deployments must configure CORS properly.

## Authentication

- Admin login uses `POST /api/Admin/login`.
- Normal user login uses `POST /api/Auth/login` after admin login is rejected.
- Register uses `POST /api/Auth/register`.
- Register assigns role `"student"` automatically; the register page does not show a role field.
- Admin users are redirected to `/dashboard`.
- Student users are redirected to `/student-dashboard`.

## Dashboards

- `/dashboard` is the existing admin dashboard and requires an admin user.
- `/student-dashboard` is a simple student portal and requires a non-admin logged-in user.
- Admin users who open `/student-dashboard` are redirected back to `/dashboard`.
- Student users who open `/dashboard` are redirected to `/student-dashboard`.

## Admin Header

The admin dashboard header includes:

- Module search with route suggestions.
- Dark/light theme toggle stored in `localStorage` as `cms_theme`.
- Profile dropdown with name, email, role, and logout.

The drawer footer profile/logout section has been removed.

## Key Files

- `src/api/axios.js`: Proxy-aware axios client with token interceptor.
- `src/api/apiEndpoints.js`: Auth and Admin endpoint constants.
- `src/features/auth/services/authService.js`: Admin-first login and real backend auth services.
- `src/features/auth/pages/Login.jsx`: Login UI and admin/student redirect logic.
- `src/features/auth/pages/Register.jsx`: Student registration UI.
- `src/routes/ProtectedRoute.jsx`: Role-aware route protection.
- `src/routes/AppRoutes.jsx`: Public, admin, and student routes.
- `src/Dashboard/Dashboard.jsx`: Admin sidebar, module search, theme toggle, and profile menu.
- `src/Dashboard/StudentDashboard/StudentDashboard.jsx`: Student dashboard shell.

## Routes

Public:

- `/`, `/login`, `/register`, `/forgot-password`, `/verify-otp`, `/reset-password`

Admin:

- `/dashboard`
- `/dashboard/boards`, `/dashboard/boards/new`, `/dashboard/boards/:boardId/edit`
- `/dashboard/academic-years`, `/dashboard/academic-years/new`
- `/dashboard/groups`, `/dashboard/groups/add`, `/dashboard/groups/edit/:groupId`
- `/dashboard/sections`, `/dashboard/subjects`, `/dashboard/faculty`, `/dashboard/reports`

Student:

- `/student-dashboard`

## API Endpoints

Admin:

- `POST /api/Admin/login`
- `POST /api/Admin`
- `GET /api/Admin`
- `GET /api/Admin/{adminId}`
- `POST /api/Admin/change-password`
- `PUT /api/Admin/{adminId}/status`

Auth:

- `POST /api/Auth/login`
- `POST /api/Auth/register`
- `POST /api/Auth/forgot-password`
- `POST /api/Auth/verify-otp`
- `POST /api/Auth/reset-password`
- `GET /api/Auth/users`
- `GET /api/Auth/user/{id}`

## Build and Lint

```bash
npm run lint
npm run build
```
