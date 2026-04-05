# Finance Operations Dashboard

This project delivers a finance operations dashboard with governed access controls, record management, and executive reporting:

- React frontend with `react-router-dom`
- Node.js backend using the built-in `http` module
- JSON file persistence for users and financial records
- Role-based access control enforced by the backend

## Features

### Core requirements covered

- User creation and management
- Role assignment for `viewer`, `analyst`, and `admin`
- Active and inactive user states
- Financial record CRUD support
- Filtering by type, category, and date range
- Dashboard summary APIs for totals, category breakdowns, recent activity, and monthly trends
- Validation and useful API error responses
- Persistent local storage in `server/data/storage.json`

### Optional enhancements included

- Mock token authentication
- Pagination for record listing
- Soft delete for records
- Manual sign-in form with demo credentials shown on the login screen
- Dark mode with persisted theme preference
- Indian localization for currency, dates, and seeded business data
- Backend refactored into `lib`, `models`, and route modules

## Access model

- `viewer`: executive summary access
- `analyst`: reporting and record review access
- `admin`: full record and user administration access

The frontend adapts navigation by account profile, while the backend remains the enforcement layer for every protected action.

## Seeded accounts

Use the login form and enter any of these demo email addresses. The login screen also shows them as selectable references:

- `Riya Kapoor` - `riya.kapoor@finboard.local` - `admin`
- `Aarav Mehta` - `aarav.mehta@finboard.local` - `admin`
- `Neha Sharma` - `neha.sharma@finboard.local` - `analyst`
- `Priya Nair` - `priya.nair@finboard.local` - `viewer`

An inactive account is also included for access-control testing:

- `Karan Iyer` - `karan.iyer@finboard.local` - `viewer` - `inactive`

## Frontend experience

- Manual sign-in flow using demo email addresses
- Theme toggle with light and dark mode
- Dashboard formatted with Indian locale conventions:
  - currency in `INR`
  - dates and month labels in `en-IN`
- Role-aware navigation that only shows allowed areas
- Executive overview, record workspace, and user administration screens

## API overview

### Auth

- `POST /api/auth/login`
- `GET /api/auth/me`

### Dashboard

- `GET /api/summary`

### Records

- `GET /api/records`
- `POST /api/records`
- `PUT /api/records/:id`
- `DELETE /api/records/:id`

Supported record query params:

- `page`
- `pageSize`
- `type`
- `category`
- `dateFrom`
- `dateTo`
- `includeDeleted`

### Users

- `GET /api/users`
- `POST /api/users`
- `PUT /api/users/:id`

## Backend structure

The backend has been split into smaller modules for readability and maintenance:

- [server/server.js](d:\coding\College-projects\Internship\Finance_Dashboard\server\server.js): server startup and top-level error handling
- [server/routes.js](d:\coding\College-projects\Internship\Finance_Dashboard\server\routes.js): route handling
- [server/config.js](d:\coding\College-projects\Internship\Finance_Dashboard\server\config.js): configuration and permissions
- [server/lib](d:\coding\College-projects\Internship\Finance_Dashboard\server\lib): shared helpers for auth, HTTP, errors, storage, records, and users
- [server/models](d:\coding\College-projects\Internship\Finance_Dashboard\server\models): lightweight `userModel` and `recordModel` modules for data operations
- [server/data](d:\coding\College-projects\Internship\Finance_Dashboard\server\data): seeded data and persisted storage

## Local setup

Install dependencies:

```bash
npm install
```

Run the backend:

```bash
npm run server
```

Run the frontend in a second terminal:

```bash
npm run dev
```

Frontend:

- Vite app: `http://localhost:5173`

Backend:

- API base URL: `http://localhost:4000/api`

If needed, you can change the frontend API target with `VITE_API_URL`.

## Login flow

1. Start the frontend and backend.
2. Open `http://localhost:5173`.
3. Enter one of the seeded email addresses on the sign-in form, or click `Use this email` to autofill it.
4. Click `Sign In`.

## Validation and error handling

Examples of validation handled by the backend:

- positive numeric amounts only
- valid role and status values only
- valid email format for users
- valid `YYYY-MM-DD` record dates
- duplicate email protection
- permission-based `401` and `403` responses
- `404` for missing resources
- `422` for validation failures

## Persistence approach

This project uses a simple JSON file at `server/data/storage.json`. On first run, the backend creates the file with seed users and sample finance records.

This approach keeps the project easy to review and run without external database setup.

## Assumptions

- Summary data should be visible to every active signed-in user
- Viewers should not see raw financial records
- Soft-deleted records should be excluded from summary calculations
- Mock authentication is sufficient for local evaluation and demonstration

