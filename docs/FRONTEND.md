# FRONTEND.md — conventions for anything4boys

Short, opinionated rules so every surface feels like one app. The preset
(shadcn `radix-nova`, base `mist`, theme `teal`, font Inter) is **locked** —
never edit `app/globals.css` or `components.json`.

## Stack

- **Next.js 16 App Router** + React 19, TypeScript strict.
- **Convex** for all data (`useQuery` / `useAction` / `useMutation` / `usePaginatedQuery`, SSR `preloadQuery` where worthwhile).
- **shadcn/ui** components from `components/ui/**` (already installed — see below). Compose them; don't add new primitives.
- **nuqs** for URL state (filters/pagination tabs), **sonner** for toasts (`toast.*`), **lucide-react** for icons.
- Path alias: `@/*` → repo root. Convex refs: `import { api } from "@/convex/_generated/api";`

## Server vs client components

- Pages are **server components** by default (static/SEO friendly). Client
  interactions go in a child with `"use client"`.
- In client components read route data via `useParams()` / `useSearchParams()`
  (inside `<Suspense>` in the parent page — required, or `next build` fails).
- In server components `await params; await searchParams;` (Next 16 Promises).
- For the creator page, prefer `preloadQuery(api.creators.getByUsername, {…})`
  (`convex/nextjs`) + `usePreloadedQuery` in the client view. No token needed —
  the query is public.

## Layout + visual language

- Every page starts with a container: `mx-auto w-full max-w-6xl px-4` (+ `py-10` or more).
- Cards: `rounded-2xl border bg-card` (or the `Card` component). Keep radii consistent with the preset.
- Colour via semantic tokens only: `bg-background`, `text-foreground`,
  `text-muted-foreground`, `bg-muted`, `border-border`, `bg-primary`,
  `text-primary-foreground`, `bg-accent`. Never raw hex values or `text-gray-*`.
- Numeric emphasis (amounts, balances): `tabular-nums font-medium`.
- Keep headings compact: `text-2xl font-semibold tracking-tight` for page H1s.
- Installed primitives: alert-dialog, alert, avatar, badge, breadcrumb, button,
  card, dialog, dropdown-menu, empty, field, input-group, input, label, progress,
  select, separator, sheet, sidebar, skeleton, sonner, spinner, switch, table,
  tabs, textarea, tooltip.

## Recurring patterns

**Money**: integer minor units everywhere; display with
`formatMoney(minor, currency)` from `@/lib/format`; parse inputs with
`parseMajorAmount(value, currency)` (null → validation error).

**Loading**: `Skeleton` blocks that roughly match the content shape (not spinners
for content areas). **Empty**: `Empty` component with a short sentence.
**Errors**: `toast.error(appErrorMessage(error))` — never `alert()`, never raw errors.

**Busy buttons**: local `useState` or `useTransition`; disable the button and
show `<Spinner />`/loading text while the mutation/action is in flight.

**Auth-gated pages** (dashboard, onboarding): wrap content in
`<RequireAuth>{…}</RequireAuth>` (`components/require-auth.tsx`). Admin pages:
`useQuery(api.admin.amIAdmin)` → when `false`, render a "restricted" state
(never call other admin functions).

**Destructive actions**: `AlertDialog` for suspends, payout failures, payout marking.

**Forms**: controlled inputs + local state, validate on submit with the shared
constants (e.g. `USERNAME_MAX_LENGTH`, `MESSAGE_MAX_LENGTH`); show inline hints
and `toast` on failure. Field UI: `Field` + `Label` + `Input`/`Textarea`.

**Dates**: `formatDate(ms)` / `formatDateTime(ms)` / `formatRelativeTime(ms)` from `@/lib/format`. All backend timestamps are epoch ms.

## Route conventions

| Field | Rule |
|---|---|
| Page titles | `metadata: { title: "…" }` in server pages (template appends `· anything4boys`) |
| Client pages | cannot export metadata → keep page server-side and delegate rendering |
| Not found | creator page: `notFound()` when `creator === null` (or a friendly inline empty state) |

## Verification before handing work back

1. `npx tsc --noEmit` → **zero errors**.
2. Grep your files for `console.log` — remove them.
3. Check every async surface has loading + empty + error handling.
4. Do **not** run `next build`, `npm run dev`, or any `convex` command (the lead
   builds/integrates — concurrent builds/dev-servers fight over `.next`/deployment).
5. Report back: files touched, what works, anything unresolved.
