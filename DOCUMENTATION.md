# Source Desk — Technical Documentation

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Database Schema](#4-database-schema)
5. [Authentication](#5-authentication)
6. [Role-Based Access Control](#6-role-based-access-control)
7. [API Reference](#7-api-reference)
8. [Real-Time Updates — SSE & PostgreSQL LISTEN/NOTIFY](#8-real-time-updates--sse--postgresql-listennotify)
9. [Image Upload & Storage](#9-image-upload--storage)
10. [Frontend Components](#10-frontend-components)
11. [Security Model](#11-security-model)
12. [Environment Variables](#12-environment-variables)
13. [Running the Project](#13-running-the-project)

---

## 1. Project Overview

**Source Desk** is a sourcing request management platform that allows customers to submit product sourcing requests, employees to review and quote those requests, and admins to manage users and oversee all activity.

The workflow is:

```
Customer submits request
       ↓
Employee reviews & adds quote price
       ↓
Status moves to QUOTED
       ↓
Customer approves the quote
       ↓
Status progresses: APPROVED → PURCHASED → AT_WAREHOUSE → SHIPPED → DONE
```

All three user roles see live updates without refreshing — powered by Server-Sent Events backed by PostgreSQL LISTEN/NOTIFY.

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.1.6 (App Router) |
| Language | TypeScript 5 |
| UI | React 19, PrimeReact 10, PrimeFlex, Tailwind CSS 4 |
| Charts | Chart.js 4, react-chartjs-2 |
| Auth | NextAuth.js v4 (credentials + Google OAuth) |
| ORM | Prisma 7 with `@prisma/adapter-pg` |
| Database | PostgreSQL |
| Object Storage | MinIO (S3-compatible via `@aws-sdk/client-s3`) |
| Real-time | Server-Sent Events + PostgreSQL LISTEN/NOTIFY |
| Validation | Zod v4 |
| Password hashing | bcrypt (12 rounds) |
| Notifications | react-hot-toast |

---

## 3. Project Structure

```
source-desk/
├── proxy.ts                        # Next.js 16 route protection (replaces middleware.ts)
├── next.config.ts                  # Security headers, Next.js config
├── prisma/
│   └── schema.prisma               # Data models, indexes, enums
├── lib/
│   ├── prisma.ts                   # Prisma client singleton (PrismaPg adapter)
│   ├── minio.ts                    # S3 client for MinIO
│   ├── notify.ts                   # pg_notify helper for SSE push
│   ├── requestSelect.ts            # Shared Prisma select object for Request queries
│   └── definitions.ts              # Zod schemas (signup validation)
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/     # NextAuth handler + authOptions
│   │   ├── events/                 # SSE endpoint (LISTEN/NOTIFY)
│   │   ├── request/                # Request CRUD
│   │   ├── user/                   # User management (admin only)
│   │   ├── upload/                 # Image upload to MinIO
│   │   └── image/[...key]/         # Authenticated image proxy
│   ├── action/
│   │   └── auth.ts                 # Signup server action
│   ├── types/
│   │   └── next-auth.d.ts          # NextAuth type extensions (id, role)
│   ├── (auth)/
│   │   ├── signin/page.tsx         # Sign-in page (credentials + Google)
│   │   └── signup/page.tsx         # Sign-up page
│   ├── unauthorized/page.tsx       # 403 landing page
│   └── ui/
│       ├── components/
│       │   └── SessionWrapper.tsx  # Shared SessionProvider wrapper
│       ├── admin/
│       │   ├── page.tsx            # Server component — auth guard
│       │   └── components/
│       │       ├── AdminDashboardClient.tsx  # Main admin shell
│       │       ├── RequestTable.tsx          # All requests with edit/delete
│       │       └── EmployeeTable.tsx         # User management table
│       ├── employee/
│       │   ├── page.tsx
│       │   └── components/
│       │       ├── EmployeeDashboardClient.tsx
│       │       └── EmployeeRequestTable.tsx  # Requests with quote pricing
│       └── customer/
│           ├── page.tsx
│           └── components/
│               ├── CustomerDashboardClient.tsx
│               └── CustomerRequestTable.tsx  # Requests with approve/edit/delete
```

---

## 4. Database Schema

### Models

#### `User`

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (UUID) | Primary key |
| `email` | `String` | Unique |
| `firstName` | `String` | |
| `lastName` | `String` | |
| `password` | `String?` | Nullable — Google OAuth users have no password |
| `role` | `Role` enum | Default: `CUSTOMER` |
| `createdAt` | `DateTime` | |
| `updatedAt` | `DateTime` | Auto-updated |
| `requests` | `Request[]` | Requests created by this customer |
| `quotedRequests` | `Request[]` | Requests quoted by this employee |

#### `Request`

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (UUID) | Primary key |
| `name` | `String` | Product name |
| `quantity` | `Int` | Default: 1 |
| `description` | `String` | |
| `img_url` | `String` | JSON array of `/api/image/...` URLs |
| `quotePrice` | `Float` | Price quoted by employee |
| `finalPrice` | `Float` | Final approved price |
| `status` | `Status` enum | Default: `PENDING` |
| `customerId` | `String` | FK → `User.id` |
| `quotedById` | `String?` | FK → `User.id` (nullable) |

**Indexes:** `customerId`, `quotedById`, `status`, `createdAt`

### Enums

**`Role`:** `ADMIN` | `EMPLOYEE` | `CUSTOMER`

**`Status`** (order lifecycle):

```
PENDING → QUOTED → APPROVED → PURCHASED → AT_WAREHOUSE → SHIPPED → DONE
```

Status transitions are validated server-side — only the above progression is allowed. For example, a `PENDING` request can only move to `QUOTED`; attempting to jump to `SHIPPED` directly is rejected with a 400 error.

---

## 5. Authentication

Authentication is handled by **NextAuth.js v4** configured in `app/api/auth/[...nextauth]/route.ts`.

### Providers

#### Credentials (email + password)
- User is looked up by email in the database
- Password is verified with `bcrypt.compare`
- Google-only users (no password) are rejected at the credentials provider level

#### Google OAuth
- On first sign-in, the user is upserted into the database as a `CUSTOMER`
- On subsequent sign-ins, the existing record is left unchanged (`update: {}`)
- The JWT callback fetches the user's Prisma `id` and `role` from the DB so the session reflects the correct internal UUID (not Google's subject ID)

### JWT & Session

```ts
// authOptions
session: { strategy: "jwt", maxAge: 24 * 60 * 60 }  // 24-hour sessions
```

The JWT callback enriches the token with `role` and corrects `token.sub` to the Prisma UUID:

```ts
async jwt({ token, user, account }) {
  if (user?.role) token.role = normalizeRole(user.role);
  if (account?.provider === "google" && token.email) {
    const dbUser = await prisma.user.findUnique({ where: { email: token.email }, select: { id: true, role: true } });
    if (dbUser) { token.sub = dbUser.id; token.role = normalizeRole(dbUser.role); }
  }
  return token;
}
```

The session callback exposes `session.user.id` and `session.user.role` to all server and client components.

### Signup

New accounts are created exclusively via the `signup` server action (`app/action/auth.ts`). The role is **always hardcoded to `CUSTOMER`** — the client cannot influence it. Passwords are hashed with bcrypt at 12 rounds.

---

## 6. Role-Based Access Control

RBAC is enforced at two layers:

### Layer 1 — Route Protection (`proxy.ts`)

Next.js 16 uses `proxy.ts` instead of `middleware.ts`. The `proxy` function intercepts all `/ui/*` routes:

```
/ui/admin/*    → requires role === "admin"
/ui/employee/* → requires role === "employee"
/ui/customer/* → requires role === "customer"
```

Unauthenticated users are redirected to `/signin`. A user accessing the wrong role's dashboard is redirected to their own dashboard.

### Layer 2 — API Authorization

Every API route independently verifies the session. This provides defense-in-depth — even if the proxy were bypassed, the API enforces its own rules.

| Endpoint | Who can call it |
|---|---|
| `GET /api/events` | Any authenticated user (data filtered by role) |
| `GET /api/request` | Any authenticated user (customers see own requests only) |
| `POST /api/request` | `customer` only |
| `PUT /api/request/[id]` | Any authenticated user (customers restricted to their own) |
| `DELETE /api/request/[id]` | Any authenticated user (customers restricted to their own) |
| `GET /api/user` | `admin` only |
| `POST /api/user` | `admin` only |
| `PUT /api/user/[id]` | `admin` only |
| `DELETE /api/user/[id]` | `admin` only |
| `POST /api/upload` | Any authenticated user |
| `GET /api/image/[...key]` | Any authenticated user |

### Layer 3 — Server Component Guards

Each dashboard page (`app/ui/*/page.tsx`) is a server component that calls `getServerSession` and calls `redirect()` before rendering if the role doesn't match.

---

## 7. API Reference

### `GET /api/events`
SSE stream. Returns initial data immediately, then pushes on DB changes. See [Section 8](#8-real-time-updates--sse--postgresql-listennotify) for full details.

### `GET /api/request`
Returns requests filtered by role:
- `customer` → only their own requests
- `employee` / `admin` → all requests

### `POST /api/request`
Creates a new request. Only `customer` role allowed. `customerId` is taken from the session — the client cannot override it.

**Body:**
```json
{ "name": "string", "quantity": 1, "description": "string", "img_url": "string" }
```

### `PUT /api/request/[id]`
Updates a request. Body is validated with Zod before use.

**Allowed fields:**
```json
{
  "name": "string",
  "quantity": 1,
  "description": "string",
  "img_url": "string",
  "quotePrice": 0.0,
  "finalPrice": 0.0,
  "status": "PENDING | QUOTED | APPROVED | ...",
  "quotedById": "uuid | null"
}
```

Status transitions are enforced. Replaced images are deleted from MinIO automatically.

### `DELETE /api/request/[id]`
Deletes a request and cleans up its images from MinIO.

### `GET /api/user`
Returns all users. Admin only.

### `POST /api/user`
Creates a new user. Admin only. Password is hashed server-side.

### `PUT /api/user/[id]`
Updates user fields (`email`, `firstName`, `lastName`, `role`). Role is validated against `ADMIN | EMPLOYEE | CUSTOMER` before reaching Prisma. Admin only.

### `DELETE /api/user/[id]`
Deletes a user. Runs as a transaction — deletes the user's requests first to avoid FK constraint errors, then deletes the user. Admin only.

### `POST /api/upload`
Uploads up to 3 images (max 5 MB each) to MinIO. Validates MIME type server-side (only `image/*` allowed). Returns an array of `/api/image/<key>` URLs.

### `GET /api/image/[...key]`
Authenticated image proxy. Fetches the object from MinIO and streams it to the client. Requires a valid session. `Cache-Control: private, max-age=31536000, immutable`.

---

## 8. Real-Time Updates — SSE & PostgreSQL LISTEN/NOTIFY

### Overview

Instead of polling the API on a timer, the app uses a **push-only** model:

1. The client opens a persistent SSE connection to `/api/events`
2. The server sends the initial data payload immediately
3. Whenever any mutation happens (request created/updated/deleted, user created/updated/deleted), the server fires a PostgreSQL notification
4. The SSE connection receives the notification and pushes a fresh data payload to the client
5. The client updates its state — no polling, no wasted requests

### Server Side (`app/api/events/route.ts`)

```
Client connects to GET /api/events
       ↓
Session verified (401 if not authenticated)
       ↓
ReadableStream created
       ↓
fetchData() → initial payload sent immediately via SSE
       ↓
Dedicated pg.Client opens connection
       ↓
LISTEN source_desk_updates
       ↓
On notification → fetchData() → send updated payload
       ↓
Heartbeat `: heartbeat\n\n` every 15 seconds (keeps connection alive through proxies)
       ↓
On request abort → UNLISTEN → pg.Client.end() → controller.close()
```

**Why a dedicated `pg.Client`?**

PostgreSQL's `LISTEN` command requires a long-lived, stateful connection that stays open and waits for notifications. Prisma uses a connection pool — connections are borrowed and returned, so they cannot hold a persistent `LISTEN` state. A raw `pg.Client` is used exclusively for listening; all data fetching still goes through Prisma.

**Data filtering by role:**

```ts
async function fetchData(role: string, userId: string) {
  if (role === "admin")    return { requests: [...all], users: [...all] };
  if (role === "employee") return { requests: [...all] };
  return { requests: [...only this customer's] };  // customer
}
```

Each client only ever receives data they are authorized to see.

**Heartbeat:**

Some proxies and load balancers close idle HTTP connections after 30–60 seconds. A SSE comment (`: heartbeat`) is sent every 15 seconds to keep the connection alive without triggering a data event on the client.

### Client Side (all dashboard components)

```ts
useEffect(() => {
  const source = new EventSource("/api/events");

  source.onmessage = (e) => {
    const data = JSON.parse(e.data);
    if (data.requests) setRequests(data.requests);
    if (data.users)    setUsers(data.users);
  };

  source.onerror = () => {
    setSseError(true);   // shows dismissible red banner
    source.close();
  };

  return () => source.close();  // cleanup on unmount
}, []);
```

### Triggering Notifications (`lib/notify.ts`)

After any write operation, the API calls:

```ts
await notifyUpdate();
// which executes: SELECT pg_notify('source_desk_updates', '')
```

This is wrapped in a try/catch — if the notification fails (e.g. DB hiccup), it logs the error but does **not** fail the mutation response. The write always completes; the push is best-effort.

### Flow Diagram

```
Customer creates request
        ↓
POST /api/request → prisma.request.create()
        ↓
notifyUpdate() → pg_notify('source_desk_updates', '')
        ↓
PostgreSQL broadcasts notification
        ↓
All open pg.Client LISTEN connections receive it
        ↓
Each SSE handler runs fetchData() for its user
        ↓
Pushes `data: {...}\n\n` to each connected client
        ↓
All dashboards (admin, employee, this customer) update simultaneously
```

---

## 9. Image Upload & Storage

Images are stored in **MinIO** (an S3-compatible object store) and served through an authenticated proxy.

### Upload Flow

1. Client sends a `multipart/form-data` POST to `/api/upload`
2. Server validates: session required, max 3 files, max 5 MB each, `image/*` MIME type only
3. Each file is assigned a UUID-based key: `uploads/<uuid>-<originalname>`
4. File is streamed to MinIO via `PutObjectCommand`
5. Server returns an array of proxy URLs: `["/api/image/uploads/<uuid>-<name>", ...]`
6. These URLs are stored in `Request.img_url` as a JSON array

### Image Serving

`GET /api/image/[...key]` verifies the session, then fetches the object from MinIO using `GetObjectCommand` and streams it to the client. Images are never publicly accessible — all requests must be authenticated.

`Cache-Control: private, max-age=31536000, immutable` — cached in the browser for a year but marked private so shared caches (CDNs, proxies) don't store them.

### Image Cleanup

When a request is updated with new images or deleted entirely, the old MinIO objects are deleted:

```ts
const match = url.match(/\/api\/image\/(.+)$/);
minio.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: match[1] }))
```

Deletions are fire-and-forget (errors are logged but don't fail the request update).

---

## 10. Frontend Components

### Auth Pages

#### `app/(auth)/signin/page.tsx`
- Email/password form with `next-auth/react signIn("credentials")`
- Google sign-in button: `signIn("google", { callbackUrl: "/signin" }, { prompt: "select_account" })`
- After sign-in, a `useEffect` watches the session and redirects based on role:
  - `admin` → `/ui/admin`
  - `employee` → `/ui/employee`
  - `customer` → `/ui/customer`

#### `app/(auth)/signup/page.tsx`
- Calls the `signup` server action
- Displays Zod validation errors inline
- On success, redirects to `/signin`

### Admin Dashboard

#### `AdminDashboardClient.tsx`
- Sidebar navigation with sections: Dashboard overview, Requests, Employees
- Opens an `EventSource` on mount; receives `{ requests, users }` from SSE
- Overview section shows charts (status distribution, request volume over time) built with Chart.js
- Renders `RequestTable` and `EmployeeTable` as sub-components

#### `RequestTable.tsx`
- PrimeReact `DataTable` with inline editing
- Admins can edit any field: name, quantity, description, status, quote/final price
- Image carousel with lightbox for attached images
- Delete with confirmation dialog (also cleans up MinIO images)

#### `EmployeeTable.tsx`
- PrimeReact `DataTable` for user management
- Admins can edit email, first/last name, and role inline
- Delete user (cascades to user's requests on the server)

### Employee Dashboard

#### `EmployeeDashboardClient.tsx`
- Opens SSE, receives all requests
- Overview statistics: total, pending, quoted, approved counts
- Renders `EmployeeRequestTable`

#### `EmployeeRequestTable.tsx`
- Focused on `PENDING` requests
- Employees can set `quotePrice` and `finalPrice` — saving automatically moves status to `QUOTED`
- Assigns `quotedById` to the current employee's ID

### Customer Dashboard

#### `CustomerDashboardClient.tsx`
- Opens SSE, receives only this customer's requests
- New request form: name, quantity, description, image upload (up to 3 images)
- Status summary cards
- Renders `CustomerRequestTable`

#### `CustomerRequestTable.tsx`
- Displays the customer's own requests
- Customers can edit name, quantity, description on `PENDING` requests
- Can replace images
- Can approve a `QUOTED` request (moves to `APPROVED`)
- Can delete requests

### Shared

#### `SessionWrapper.tsx`
Wraps children in NextAuth's `<SessionProvider>` so client components can use `useSession()`. Used by all three dashboard page server components.

---

## 11. Security Model

### Authentication
- All protected routes (UI and API) require a valid NextAuth session
- Sessions expire after **24 hours** (JWT `maxAge`)
- Passwords hashed with **bcrypt at 12 rounds**
- Google OAuth users never have a password; credentials login is blocked for them

### Password Policy
- Minimum 8 characters
- Must contain at least one number or special character (`0-9 ! @ # $ % ^ & *`)

### Authorization
- Three-layer RBAC: proxy → server component → API route
- `POST /api/request` is restricted to `customer` role — employees and admins cannot create requests
- Customers can only read, update, and delete their **own** requests
- Admin-only endpoints (`/api/user/*`) are blocked at the API level for all other roles
- Role field in user updates is validated against the allowed enum before reaching Prisma

### Input Validation
- Signup form: Zod schema (`lib/definitions.ts`)
- Request PUT body: Zod schema in `app/api/request/[id]/route.ts` — types, ranges, and enum values all checked before DB write
- File uploads: MIME type checked server-side, 5 MB per file limit

### HTTP Security Headers (set globally in `next.config.ts`)

| Header | Value | Purpose |
|---|---|---|
| `X-Frame-Options` | `DENY` | Prevents clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer leakage |
| `X-XSS-Protection` | `1; mode=block` | Legacy XSS filter |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disables sensitive browser APIs |

### Image Access
- Images are served through `/api/image/[...key]` which requires authentication
- `Cache-Control: private` prevents CDNs or shared caches from storing user images
- Images are never accessible without a valid session

### Data Integrity
- User deletion runs as a Prisma `$transaction` — requests are deleted first, then the user, preventing FK constraint failures
- Status transitions are enforced server-side — only valid progressions are accepted
- `notifyUpdate()` is wrapped in try/catch — notification failures never break mutation responses

---

## 12. Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Yes | Secret for signing JWTs |
| `NEXTAUTH_URL` | Yes | Base URL of the app (e.g. `http://localhost:3000`) |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `MINIO_ENDPOINT` | Yes | MinIO server URL (e.g. `http://localhost:9000`) |
| `MINIO_ACCESS_KEY` | Yes | MinIO access key |
| `MINIO_SECRET_KEY` | Yes | MinIO secret key |
| `MINIO_BUCKET` | No | Bucket name (default: `source-desk`) |

---

## 13. Running the Project

### Prerequisites
- Node.js 20+
- PostgreSQL
- MinIO (or any S3-compatible store)
- pnpm

### Setup

```bash
# Install dependencies
pnpm install

# Apply database migrations
pnpm prisma migrate deploy

# Generate Prisma client
pnpm prisma generate

# Start development server
pnpm dev
```

### Production Start

The `start` script automatically runs migrations before starting:

```bash
pnpm build
pnpm start
```

### First-time Google OAuth Setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com)
2. Enable the **Google+ API** (or **People API**)
3. Create OAuth 2.0 credentials (Web Application)
4. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)
5. Copy the client ID and secret into your environment variables

### Creating the First Admin

New signups always create `CUSTOMER` accounts. To create an admin, sign up normally then update the role directly in the database:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'your@email.com';
```

Or use the admin dashboard once you have an admin account to promote other users.
