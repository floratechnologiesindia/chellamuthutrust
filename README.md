# Chellamuthu Connect

Charity management and donor engagement platform for M.S. Chellamuthu Trust — built as a **MERN stack** application with Docker support for dev and production.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, shadcn/ui, Tailwind CSS |
| API | Node.js, Express, TypeScript |
| Database | MongoDB (Mongoose) |
| Auth | JWT (bcrypt password hashing) |
| Containers | Docker Compose (dev + prod) |

## Project Structure

```
├── src/                    # React frontend
├── server/                 # Express API (MERN backend)
├── docker/                 # Nginx + startup scripts (prod)
├── docker-compose.dev.yml  # Dev: MongoDB + API + Vite
├── docker-compose.prod.yml # Prod: MongoDB + API + Nginx
└── Dockerfile              # Production multi-stage build
```

## Quick Start (Local)

### 1. Install dependencies

```sh
npm install
npm install --prefix server
```

### 2. Configure environment

```sh
cp .env.example .env
```

### 3. Start MongoDB

Use Docker or a local MongoDB instance:

```sh
docker run -d -p 27017:27017 --name chellamuthu-mongo mongo:7
```

### 4. Seed the database

```sh
npm run seed          # first-time seed
npm run seed:fresh    # wipe and reseed
```

### 5. Run API + frontend

```sh
# Terminal 1 — API (port 3001)
npm run dev:api

# Terminal 2 — Frontend (port 8080)
npm run dev
```

Default accounts (after `npm run seed`):

| Role | Email |
|------|-------|
| Super Admin | `superadmin@chellamuthu.local` |
| Admin | `admin@chellamuthu.local` |
| Finance | `finance@chellamuthu.local` |
| Employee | `employee@chellamuthu.local` |
| Warden | `warden@chellamuthu.local` |
| Donor | `donor@chellamuthu.local` |

Password for all: `Chellamuthu@2026`

## Dual Portals

This CRM runs as **two separate web panels** on different subdomains:

| Portal | Production URL | Local URL | Purpose |
|--------|----------------|-----------|---------|
| **Donor** | `donor.msctrust.com` | http://donor.localhost:8080 | Donations, sponsor needs, food calendar, My Account |
| **App (staff)** | `app.msctrust.com` | http://app.localhost:8080 | Admin, warden, finance, operations |

The marketing website lives at [msctrust.org](https://msctrust.org). Donors are redirected from the website into the donor portal — the panel header includes the same site navigation so the experience feels continuous.

**Local subdomain setup:** Modern browsers resolve `*.localhost` automatically. Use only:

- http://donor.localhost:8080 — donor portal
- http://app.localhost:8080 — staff portal

Plain `http://localhost:8080` automatically redirects to the correct subdomain (staff paths → `app.localhost`, donor paths → `donor.localhost`).

## Docker Development

```sh
npm run docker:dev
```

Services:
- Frontend: http://localhost:8080
- API: http://localhost:3001
- MongoDB: localhost:27017

## Docker Production

```sh
cp .env.example .env
# Set JWT_SECRET and other secrets in .env
npm run docker:prod
```

App served at http://localhost (port 80) with Nginx proxying `/api` and `/uploads` to the Express server.

## API Endpoints

All REST endpoints are under `/api`:

- `POST /api/auth/login`, `/register`, `/forgot-password`, `/reset-password`
- `GET /api/auth/me`
- CRUD resources: `/api/trusts`, `/api/homes`, `/api/needs`, `/api/donations`, etc.
- `GET /api/donors` — donors with donation stats
- `POST /api/create-razorpay-order`, `/verify-razorpay-payment`
- `POST /api/send-donor-report`, `/send-whatsapp`
- `POST /api/storage/:bucket/upload` — file uploads

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Frontend API base URL (default: `/api`) |
| `VITE_WEBSITE_URL` | Public website URL (default: `https://msctrust.org`) |
| `VITE_DONOR_PORTAL_URL` | Donor panel URL (default: `http://donor.localhost:8080`) |
| `VITE_APP_PORTAL_URL` | Staff panel URL (default: `http://app.localhost:8080`) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing secret |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Payment gateway |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | Email notifications |
| `WATI_API_ENDPOINT` / `WATI_ACCESS_TOKEN` | WhatsApp integration |

## Migration from Supabase

The frontend uses an API compatibility layer (`src/integrations/supabase/client.ts`) that routes all former Supabase calls to the Express API. No UI changes were required — all hooks and components continue to work through the same interface.

**Note:** This is a fresh MongoDB deployment. Existing Supabase/PostgreSQL data must be migrated separately if you need production data continuity.
