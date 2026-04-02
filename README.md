# Finance Dashboard Assignment

This project implements the requested finance data processing and access control system as a small full-stack app:

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

## Access model

- `viewer`: can read dashboard summaries only
- `analyst`: can read summaries and financial records
- `admin`: can manage users and fully manage records

The frontend hides routes based on permissions, but the backend is the real enforcement layer.

## Seeded demo accounts

Use any of these on the login screen:

- `admin@finboard.local`
- `analyst@finboard.local`
- `viewer@finboard.local`

There is also an inactive seeded user for testing access denial:

- `inactive@finboard.local`

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

This was chosen to keep the submission easy to review and run without requiring external database setup.

## Assumptions

- Summary data should be visible to every active signed-in user
- Viewers should not see raw financial records
- Soft-deleted records should be excluded from summary calculations
- Mock auth is acceptable for a local assignment submission

## Verification completed

- `npm run lint`
- `npm run build`
- backend smoke test for `/api/health`, login, and summary retrieval
