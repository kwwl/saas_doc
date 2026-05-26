# SaaS Doc — Frontend

Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui.

UI strings are in French. Code, comments, and docs are in English.

## Stack

| Layer             | Technology                                           |
| ----------------- | ---------------------------------------------------- |
| Framework         | Next.js 15 (App Router) + React 19                   |
| Language          | TypeScript (strict mode)                             |
| Styling           | Tailwind CSS v4 + `tw-animate-css`                   |
| UI components     | shadcn/ui v4 (built on `@base-ui/react`)             |
| Icons             | `lucide-react`                                       |
| Toasts            | `sonner`                                             |
| Forms             | `react-hook-form` + `zod` (via `@hookform/resolvers`) |
| JWT decode        | `jwt-decode`                                         |
| Class composition | `class-variance-authority`, `clsx`, `tailwind-merge` |
| Fonts             | Geist Sans + Geist Mono (`next/font/google`)         |
| Tests             | Vitest 3 + React Testing Library + jsdom             |

## Setup

```bash
cd frontend
npm install --legacy-peer-deps
cp .env.example .env.local
# Edit .env.local if your backend is not on http://localhost:8000
npm run dev
```

App available at <http://localhost:3000>.

The backend must be running on the URL set by `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`). See the root README for backend setup.

> **Note on `--legacy-peer-deps`**: React 19 is recent and some test/dev libs still
> declare React 18-only peer ranges. `--legacy-peer-deps` is safe here — the libs
> we use (react-hook-form, RTL, etc.) are all verified compatible with React 19.

## Scripts

| Script              | Purpose                                  |
| ------------------- | ---------------------------------------- |
| `npm run dev`       | Start dev server (hot reload)            |
| `npm run build`     | Production build                         |
| `npm run start`     | Run the production build                 |
| `npm run lint`      | ESLint                                   |
| `npm test`          | Run all Vitest tests once                |
| `npm run test:watch` | Watch mode                              |

## Project structure

```
frontend/
├── app/
│   ├── layout.tsx               # Root layout: fonts, metadata, AuthProvider, Toaster
│   ├── page.tsx                 # Public home (/)
│   ├── globals.css              # Tailwind v4 + shadcn CSS variables
│   ├── (auth)/                  # Route group: unauthenticated pages
│   │   ├── layout.tsx           # Centered container, redirects if already logged in
│   │   ├── login/page.tsx       # /login
│   │   └── register/page.tsx    # /register
│   └── (protected)/             # Route group: authenticated pages
│       ├── layout.tsx           # Guard + header (email + logout)
│       └── dashboard/page.tsx   # /dashboard (placeholder, 3 totals)
├── components/
│   └── ui/                      # shadcn components (editable, not vendored)
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── label.tsx
│       └── sonner.tsx           # Customized: removed next-themes dependency
├── lib/
│   ├── api.ts                   # Typed fetch wrapper + ApiError + 401 handler
│   ├── api.test.ts              # Smoke tests on the API client (7)
│   ├── auth.ts                  # localStorage helpers (token + email)
│   ├── auth-context.tsx         # AuthProvider + useAuth hook
│   ├── auth-context.test.tsx    # Smoke tests on the auth context (5)
│   ├── schemas/
│   │   └── auth.ts              # Zod schemas for login + register
│   ├── types.ts                 # TS types mirroring backend Pydantic schemas
│   └── utils.ts                 # cn() — Tailwind class merger
├── public/                      # Static assets
├── components.json              # shadcn config
├── eslint.config.mjs            # ESLint flat config (FlatCompat bridge)
├── next.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── vitest.config.ts             # Vitest + jsdom + plugin-react + @/ alias
├── vitest.setup.ts              # jest-dom matchers
└── .env.example
```

### Route groups

`(auth)` and `(protected)` are App Router **route groups** — folder names in parentheses do NOT appear in the URL. They exist to share a layout (and a guard) across a set of routes.

- `(auth)/login` resolves to `/login`
- `(protected)/dashboard` resolves to `/dashboard`

## Environment

| Variable               | Required | Default                  | Purpose                |
| ---------------------- | -------- | ------------------------ | ---------------------- |
| `NEXT_PUBLIC_API_URL`  | yes      | `http://localhost:8000`  | Backend FastAPI URL    |

The `NEXT_PUBLIC_` prefix exposes the variable to the browser bundle — never put secrets there.

## Authentication

V1 design — minimal, no cookie/session backend changes.

### Storage

| Key                | Content                  |
| ------------------ | ------------------------ |
| `saas_doc_token`   | Raw JWT (string)         |
| `saas_doc_email`   | User email (string)      |

The email is stored separately because the backend's JWT payload only contains `sub` (user_id), `org` (organization_id), and `role` — not the email. `org_id` and `role` are recovered by decoding the JWT on the fly (`jwt-decode`).

> **Security tradeoff**: localStorage is readable by JavaScript (XSS surface). V1 accepts this for simplicity. V2 should migrate to httpOnly cookies set by a backend session endpoint, which also unlocks Next.js middleware-based route protection.

### `useAuth()` hook

Wrap the app in `<AuthProvider>` (already done in `app/layout.tsx`). From any client component:

```tsx
"use client";
import { useAuth } from "@/lib/auth-context";

export function MyComponent() {
  const { user, ready, isAuthenticated, login, logout } = useAuth();

  if (!ready) return null;       // first localStorage read not done yet
  if (!isAuthenticated) return null;

  return (
    <div>
      Bonjour {user!.email} — rôle : {user!.role} — org : {user!.orgId}
    </div>
  );
}
```

The provider exposes:

- `user: { userId, email, orgId, role } | null`
- `ready: boolean` — `false` until the first `useEffect` runs (avoids hydration mismatch)
- `isAuthenticated: boolean`
- `login(token, email)` — persists to localStorage AND updates context state
- `logout()` — clears localStorage AND resets context state

### Route protection

Client-side guard in `app/(protected)/layout.tsx`: checks `isAuthenticated` once `ready`, and `router.replace("/login")` if missing. Renders `null` during the check window so protected content never flashes for a logged-out visitor.

Conversely, `(auth)/layout.tsx` redirects to `/dashboard` if a logged-in user lands on `/login` or `/register`.

### 401 handler (global)

`lib/api.ts` watches for 401 responses on **non-auth** routes:

- On `GET /clients` returning 401 → `clearAuth()` + `window.location.href = "/login"`.
- On `POST /auth/login` returning 401 → just throws `ApiError` so the form can display "Identifiants invalides".

JWT expiry is not pre-checked client-side; we let the backend reject expired tokens and react to the 401.

## API client (`lib/api.ts`)

Typed HTTP wrapper around `fetch`. Automatically attaches `Authorization: Bearer <jwt>` from localStorage when a token is present.

```ts
import { api, ApiError } from "@/lib/api";
import type { Client, ClientCreate, DashboardSummary } from "@/lib/types";

// GET
const summary = await api.get<DashboardSummary>("/dashboard");

// POST with JSON body
const created = await api.post<Client>("/clients", {
  name: "Acme SARL",
} satisfies ClientCreate);

// Multipart upload (DO NOT set Content-Type — the browser sets the boundary)
const formData = new FormData();
formData.append("file", file);
const doc = await api.upload<Document>(`/clients/${id}/documents`, formData);

// Error handling
try {
  await api.post("/auth/login", payload);
} catch (e) {
  if (e instanceof ApiError && e.status === 401) {
    toast.error("Identifiants invalides");
  }
}
```

## Forms — react-hook-form + zod

We use `react-hook-form` directly with the standard shadcn primitives (`Input`, `Label`, `Button`). The shadcn `form` wrapper component is not used in V1 (the registry didn't ship it cleanly with shadcn 4 + Base UI).

Pattern (see `app/(auth)/login/page.tsx` for the full example):

```tsx
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormValues } from "@/lib/schemas/auth";

const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

<form onSubmit={handleSubmit(onSubmit)} noValidate>
  <Input id="email" type="email" {...register("email")} aria-invalid={!!errors.email} />
  {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
  {/* ... */}
</form>;
```

Shared schemas live in `lib/schemas/`. Inferred form value types come from `z.infer<typeof schema>`.

## Tests

Vitest 3 + React Testing Library + jsdom. Run with `npm test` (or `npm run test:watch`).

Current coverage (smoke tests only):

- **`lib/api.test.ts`** (7) — JSON parsing, Authorization header, Content-Type, 204 handling, ApiError surface, **401 redirect on protected routes**, **401 no-redirect on `/auth/*`**.
- **`lib/auth-context.test.tsx`** (5) — initial state, localStorage load on mount, `login()` flow, `logout()` flow, corrupt JWT auto-cleanup.

Config:

- `vitest.config.ts` — `jsdom` environment, `@vitejs/plugin-react` for `.tsx`, `@/` alias mirroring `tsconfig.json`.
- `vitest.setup.ts` — imports `@testing-library/jest-dom/vitest` for matchers like `toBeInTheDocument`.

`window.location.href` is read-only in jsdom — tests that exercise the 401 redirect redefine it as writable in `beforeEach`.

> **Why Vitest 3 and not 4?** Vitest 4 → Vite 8 → Rolldown 1 requires Node `≥ 22.12`. We target Node 22.9 in dev (per the `engines` field in dependent packages). Vitest 3 + Vite 5 + jsdom 25 works without bumping the Node baseline.

## Types (`lib/types.ts`)

Mirrors the Pydantic schemas under `backend/app/schemas/`. **Keep them in sync** — drift here silently breaks compile-time guarantees.

Covered: `TokenResponse`, `RegisterPayload`, `LoginPayload`, `Client`, `ClientCreate`, `ClientUpdate`, `Document`, `DashboardSummary`, `RecentDocumentItem`, `RecentClientItem`, `ApiErrorDetail`, `ApiErrorResponse`.

## shadcn/ui — v4 gotchas

shadcn v4 builds on `@base-ui/react` (not Radix). A few API differences vs. v3:

- **No `asChild` prop.** To make a `<Link>` look like a button, apply `buttonVariants` directly:

  ```tsx
  import Link from "next/link";
  import { buttonVariants } from "@/components/ui/button";

  <Link href="/login" className={buttonVariants({ size: "lg" })}>
    Se connecter
  </Link>;
  ```

- **`form` component** is not in the default registry yet; we use `react-hook-form` directly.

- Components are **copied into `components/ui/`**, not imported from a package. Edit them freely — re-running `npx shadcn add <name>` will prompt before overwriting.

## What's not in this branch

The following come in later feature branches:

- `/clients` UI (list, create, edit, delete)
- `/documents` UI (upload, list per client, download, delete)
- Full dashboard (recent activity lists, currently only totals are rendered)
- Backend `/auth/me` endpoint (V1 stores email separately instead)
- httpOnly cookie auth + Next.js middleware route protection (V2 hardening)
- Backend-side password min length validation (frontend enforces 8 chars; backend should mirror)

## Conventions

- **UI in French**, code in English.
- **Server Components by default.** Add `"use client"` only when you need state, effects, or browser APIs.
- **One feature per branch**, small focused commits (see root `CLAUDE.md`).
- **Tailwind v4** uses the new `@theme` syntax in `globals.css`. CSS variables drive the shadcn color tokens.
- **Test files live next to source** (`foo.ts` ↔ `foo.test.ts`). The Vitest `include` glob picks them up automatically.
