# College Management System

A Vite + React admin dashboard for an Intermediate College Management System. The project is organized so eight team members can work in separate feature folders without route, layout, or API conflicts.

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
VITE_ENABLE_MOCK_AUTH=true
```

The API base URL is read in `src/config/env.js` and used by the central API clients in `src/api/axios.js` and `src/services/apiClient.js`. Components must not hardcode URLs or import axios directly.

## Local API Proxy / CORS Workaround

The backend may block direct browser requests from `http://localhost:5173` when CORS is not configured. In local development, Vite proxies same-origin frontend calls to the backend:

- Frontend calls `/api/...`, for example `/api/v1/boards`.
- Vite proxies that request to `VITE_API_BASE_URL`.
- Enable this with `VITE_USE_DEV_PROXY=true`.
- Restart `npm run dev` after changing `vite.config.js` or `.env`.
- Production still requires backend CORS to be configured properly.

## Folder Structure

```text
src/
  app/                 App shell and Vite entry point
  assets/              Images and static assets imported by React
  config/              Environment config
  routes/              AppRoutes and shared route path constants
  layouts/             AuthLayout and DashboardLayout
  theme/               CSS variables and global theme classes
  shared/              Reusable components and utilities
  services/            Central API client alias and endpoint map
  Dashboard/           Dashboard layout and module screens
  features/auth/       Public authentication screens and mock login helper
```

## Key Files

- `src/app/main.jsx`: React app bootstrap and global CSS imports.
- `src/app/App.jsx`: Root app component.
- `src/routes/AppRoutes.jsx`: All route definitions. Keep new routes here.
- `src/routes/routePaths.js`: Shared route constants.
- `src/Dashboard/Dashboard.jsx`: The only dashboard sidebar and main content layout. Dashboard screens render inside its `Outlet`.
- `src/layouts/AuthLayout.jsx`: Shared visual shell for login and password pages.
- `src/theme/tokens.css`: Color, spacing, radius, shadow, and font variables.
- `src/theme/theme.css`: Global app theme, sidebar, cards, tables, buttons, forms, modals, and placeholders.
- `src/api/axios.js`: Axios instance with base URL, auth token interceptor, and graceful HTML/backend error handling.
- `src/api/apiEndpoints.js`: Auth endpoint constants used by the authentication service.
- `src/services/apiClient.js`: Central API client export for feature services.
- `src/services/apiEndpoints.js`: Endpoint map for feature services.
- `src/Dashboard/Group Management/GroupList.jsx`: Group list, filters, stats, pagination, local demo fallback, and delete confirmation.
- `src/Dashboard/Group Management/AddGroup.jsx`: Add and edit form for Group records with local demo fallback.
- `src/Dashboard/Group Management/GroupList.css`: Group list page styling.
- `src/Dashboard/Group Management/AddGroup.css`: Add/edit group page styling.

## Routes

- `/`, `/login`, `/register`, `/forgot-password`, `/verify-otp`, `/reset-password`
- `/dashboard`
- `/dashboard/boards`, `/dashboard/boards/new`, `/dashboard/boards/:boardId/edit`
- `/dashboard/academic-years`, `/dashboard/academic-years/new`
- `/dashboard/groups`, `/dashboard/groups/add`, `/dashboard/groups/edit/:groupId`, `/dashboard/sections`
- `/dashboard/subjects`, `/dashboard/subjects/new`, `/dashboard/subjects/:subjectId/edit`
- `/dashboard/faculty`, `/dashboard/faculty/new`, `/dashboard/faculty/:facultyId/edit`, `/dashboard/faculty/subject-allocation`
- `/dashboard/admissions/new`, `/dashboard/students`, `/dashboard/students/:studentId`
- `/dashboard/timetable`, `/dashboard/attendance`, `/dashboard/assignments/new`
- `/dashboard/examinations/new`, `/dashboard/examinations/schedule`, `/dashboard/marks-entry`
- `/dashboard/results/publish`, `/dashboard/results/student`, `/dashboard/promotions`
- `/dashboard/fees/structure`, `/dashboard/fees/collection`, `/dashboard/certificates/generate`, `/dashboard/reports`

Backward redirect: `/faculty/subject-allocation` redirects to `/dashboard/faculty/subject-allocation`.
Compatibility redirects also preserve old dashboard URLs such as `/dashboard/subjects/add`, `/dashboard/boards/add`, `/dashboard/courses`, `/dashboard/course-management`, `/dashboard/results`, and `/dashboard/certificates`.

## Module Status

Completed/refactored:

- Auth pages and `features/auth/services/authService.js`
- Group Management under `src/Dashboard/Group Management`
- Subject List and Add/Edit Subject under `src/Dashboard/Subject Management`
- Faculty List, Add Faculty, and Faculty Subject Allocation under `src/Dashboard/Faculty Management`
- Real Dashboard Home at `/dashboard`

Placeholder only:

- Boards
- Academic Years
- Sections
- Admissions
- Students
- Timetable
- Attendance
- Assignments
- Examinations
- Exam Schedule
- Marks Entry
- Results
- Promotion
- Fee Structure
- Fee Collection
- Certificates
- Reports

Pending backend integration:

- Dashboard statistics
- Placeholder modules listed above
- Dynamic dropdown data where the backend endpoint is not available yet

## API Service Layer

Feature API calls should live inside service files and use the shared axios client. Authentication keeps `src/features/auth/services/authService.js` because it is shared by public auth pages and includes the temporary mock login switch.

`src/api/axios.js` attaches `Authorization: Bearer <token>` from `localStorage` when available and converts HTML tunnel/error responses into readable API errors.

Group Management is implemented inside `src/Dashboard/Group Management`. Per the Dashboard module style, its API and local demo helpers are kept inline in `GroupList.jsx` and `AddGroup.jsx`, using the existing axios client from `src/api/axios.js`.

Board Management uses `/api/v1/boards` through the existing axios client. During offline/backend-blocked local development it falls back to demo records in `localStorage` under `cms_demo_boards`.

Real Boards endpoints prepared:

- `GET /api/v1/boards`
- `POST /api/v1/boards`
- `GET /api/v1/boards/{boardId}`
- `PUT /api/v1/boards/{boardId}`
- `DELETE /api/v1/boards/{boardId}`
- `PATCH /api/v1/boards/{boardId}/status`
- `GET /api/v1/boards/countries`
- `GET /api/v1/boards/states/{countryId}`
- `GET /api/v1/boards/academic-patterns`
- `GET /api/v1/boards/academic-levels`
- `GET /api/v1/boards/grading-systems`
- `POST /api/v1/boards/validate-board-code`

Real Groups endpoints prepared:

- `GET /api/v1/groups`
- `POST /api/v1/groups`
- `GET /api/v1/groups/{groupId}`
- `PUT /api/v1/groups/{groupId}`
- `DELETE /api/v1/groups/{groupId}`
- `GET /api/v1/groups/board/{board}`
- `GET /api/v1/groups/validate-code`

When `VITE_ENABLE_MOCK_AUTH=true`, Group Management uses local demo records stored in `localStorage` under `cms_demo_groups`. If the backend request fails while mock auth is disabled, the screens fall back to the same local demo records so UI testing can continue. Set `VITE_ENABLE_MOCK_AUTH=false` to prefer real backend APIs.

## Temporary Demo Login

Use this only when the backend is offline and the UI needs local testing.

- Enable with `VITE_ENABLE_MOCK_AUTH=true`.
- Demo email: `admin@cms.test`
- Demo password: `Admin@123`
- Disable mock login later by setting `VITE_ENABLE_MOCK_AUTH=false`.
- Real backend integration remains unchanged; only `loginUser` switches to the local mock when the flag is enabled.

## Theme System

Use CSS variables from `src/theme/tokens.css` for colors, spacing, radius, and shadows. Shared theme classes in `src/theme/theme.css` include:

- `.card`, `.btn`, `.input`, `.select`, `.textarea`
- `.data-table`, `.empty-state`, `.placeholder`
- `.stat-grid`, `.stat-card`
- `.sidebar`, `.dashboard-content`, `.modal`

Do not add Tailwind classes or scattered hardcoded color systems.

## Shared Components

- `Button.jsx`: Standard button styling.
- `Card.jsx`: Standard panel container.
- `DataTable.jsx`: Shared table rendering.
- `EmptyState.jsx`: Empty results UI.
- `FormField.jsx`: Label, field, and error wrapper.
- `PageHeader.jsx`: Page title and action bar.
- `PagePlaceholder.jsx`: Clean pending implementation screen.
- `StatCard.jsx`: Dashboard/stat widgets.

## Team Workflow

Each team member should work inside their assigned feature folder. Add page-specific CSS under that feature only when shared theme classes are not enough. Keep cross-feature helpers in `src/shared`, and keep all HTTP functions in service files.



## Coding Rules

- Do not call axios directly from components.
- Use shared components where practical.
- Use theme variables and theme classes.
- Keep routes inside `AppRoutes`.
- Keep new feature page-specific code inside the matching `src/features/<feature-name>` folder. Existing legacy dashboard modules should be moved gradually instead of duplicated.
- Do not commit `node_modules`, `dist`, `.env`, or `.git`.
- Do not create duplicate layout wrappers inside feature pages.

## Build and Lint

```bash
npm run lint
npm run build
```
