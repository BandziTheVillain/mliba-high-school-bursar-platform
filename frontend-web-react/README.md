# Fee Payment System — Web app

The bursar's office web app for the Mliba High School fee register: the fee register with paging, the student account panel for recording payments, the Overview, payment cards and tasks.

For everything the app can do, see the [main README](../README.md).

Built with React 19, TanStack Router (file-based routes) and TanStack Query, Tailwind CSS 4, Vite and TypeScript, with Biome for linting and formatting.

## Run it

The API must be running first (see [`../api-backend`](../api-backend/README.md)).

```bash
npm install
npm run dev          # http://localhost:3000
```

In development, Vite forwards `/api/*` to `http://localhost:8000` ([`vite.config.ts`](vite.config.ts)), so the app and API share an origin and the sign-in cookie just works. If the API runs elsewhere:

```bash
API_URL=http://192.168.1.20:8000 npm run dev
```

| Script | Does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run check` | Biome lint + format check (`lint` / `format` separately) |
| `npm run generate-routes` | Regenerate `src/routeTree.gen.ts` (the dev server does this automatically) |

In production, serve `dist/` and the API from the **same site** (for example, a reverse proxy sending `/api` to FastAPI), so the httponly sign-in cookie is sent with requests. Set `COOKIE_SECURE=true` on the API when it's served over HTTPS.

## Project layout

```
src/
  routes/
    login.tsx                 sign-in
    _app.tsx                  signed-in layout: header bar, tabs, search, student side panel
    _app/index.tsx            "/" → redirects to the fee register
    _app/students/index.tsx   Fee register (server-side paging, filters, sort, print)
    _app/students/$studentId.tsx   full-page student account
    _app/overview.tsx         collection report, monthly chart, pending tasks
    _app/cards.tsx            payment cards (PDF)
    _app/tasks.tsx            task list
  components/
    ui.tsx                    shared pieces: Button, Input, Card, Letterhead, Figure,
                              PayBadge (status stamp), Pagination, Modal, Drawer …
    student-detail.tsx        student account: summary + monthly payments with running balance
    header-search.tsx         the "Find a student" box (press /)
    student-form.tsx          add / edit student form
  lib/
    api.ts                    API client + types (every request sends the cookie)
    queries.ts                TanStack Query definitions
    format.ts                 money formatting, CURRENCY, pay status helpers
    open-student.ts           open/close the side panel (?student=<id>)
    recent.ts                 "recently viewed" students (localStorage)
  styles.css                  design tokens (colours, fonts) for light and dark
```

## Conventions

- **The side panel is in the URL.** Any page can open a student with `useOpenStudent()(id)`, which sets `?student=<id>`, so refresh and the back button work.
- **Register state is in the URL too:** `page`, `size`, `q`, `form`, `status`, `ovc_status`, `sort` and `order` on `/students`. Changing a filter resets to page 1.
- **Refreshing data:** every student-related query key starts with `"students"`, so after any change `queryClient.invalidateQueries({ queryKey: ["students"] })` refreshes the register, panel, Overview and search together.
- **Styling:** the "Ledger" design. Use the tokens from `styles.css` (`bg-surface`, `text-ink-muted`, `border-field`, `text-accent` …) rather than raw colours; corners are square; amounts use `font-mono tabular-nums`. Red (`accent`) is reserved for the main action on a screen and for amounts due.
- **Status** is always the word on the stamp (Paid / Part / Unpaid), never colour alone.
- **Currency symbol:** set `CURRENCY` in `src/lib/format.ts` (empty by default).
