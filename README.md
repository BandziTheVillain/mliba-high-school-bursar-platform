# Fee Payment System

I built this to solve the problem of keeping track of school fees at my workplace. It replaces the paper fee register and spreadsheets in the bursar's office: every student's fee, every payment received month by month, and what is still owed, in one place.

It is set up for **Mliba High School** and has two parts:

- **`api-backend/`**: a FastAPI + PostgreSQL API that stores students and payments, calculates fees and generates PDF payment cards.
- **`frontend-web-react/`**: a React web app for the bursar's office, styled as a fee register (ledger).

**NOTE**: I swapped out the actual logo for a placeholder one, you can also add yours at **`api-backend/app/static/images/`** and make sure to save it as **`logo.png`**.

---

## What it can do

### Keep a fee register
- **One row per student** with what they were billed, what they have paid, what is still due, and a status stamp: **Paid**, **Part** or **Unpaid**.
- **Filter** by name, form (F1A–F5C), payment status and OVC status.
- **Sort** by name, form, billed, received or due. Money columns show the largest amounts first.
- **Page through** large lists (12, 25, 50 or 100 rows per page), with totals for the current page and for everything matching the filters.
- **Print** the register as it appears on screen.

### Record payments
- Open any student in a **side panel** without leaving the page you are on.
- Type an amount against a month and press **Enter**. It is saved straight away, and the **balance due runs down** month by month. Press **Esc** to undo an edit.
- Switch between the current year and the two before it.
- Edit a student's name, form, OVC status and number of practical subjects.

### Find any student quickly
- A search box in the header on every page. Press **`/`** to jump to it.
- Type part of a name or a form ("thabo", "f3b", "thabo f3"). Use the arrow keys and Enter to open the student.
- With nothing typed, it shows the students you viewed recently.

### Add students in bulk
- **Import a CSV** exported from Excel. Each student is added with their payments for the current year, and students already in the register (same name and form) are skipped. See [CSV format](#csv-format) below.
- Or add students one at a time with **New entry**.

### Print payment cards
- Generate printable **payment cards** (school crest, student name and form) as a PDF, 12 per landscape A4 page with crop marks.
- Choose a group (**fully paid**, **deposit paid**, or **below the deposit**), pick students, and download one PDF. Or print a single student's card from their panel.

### See how collection is going
- An **Overview** with total billed, received and due, and how many students have paid in full.
- A **breakdown by form and by OVC status**, with the percentage collected for each. Click a row to open that group in the register.
- A **chart of money received per month** for the current year (also available as a table).

### Keep a task list
- Simple to-dos for the office ("chase F3B parents", "reconcile October"), with **High / Medium / Low** priority, marked done when finished.

### Sign-in
- Staff sign in with a username and password. The session is kept in a secure (httponly) cookie for 12 hours.
- An admin account is created automatically on first start from `ADMIN_USERNAME` / `ADMIN_PASSWORD`.

---

## How fees are calculated

Each student's yearly fee depends on their OVC status, plus an extra charge per practical subject:

| OVC status | Base fee |
|---|---|
| Non OVC | 5,200.00 |
| OVC | 3,250.00 |
| OVC (Form 4) | 2,700.00 |
| Each practical subject | + 250.00 |

**Due** = fee − everything paid. A student is **Paid** when nothing is due, **Part** when something has been paid, and **Unpaid** when nothing has. The **deposit** used for payment cards is 2,500.00.

These amounts live in [`api-backend/app/constants.py`](api-backend/app/constants.py). If you change the practical subject fee, also update `PRACTICAL_SUBJECT_FEE` in [`frontend-web-react/src/lib/format.ts`](frontend-web-react/src/lib/format.ts), where it is only used for display.

---

## CSV format

The first row must be headers. Required columns:

| Column | Example | Notes |
|---|---|---|
| `Full Name` | Thabo Dlamini | Rows without a name are skipped |
| `Form` | F3B | |
| `Amount To Pay` | 3750 | The student's full fee; their OVC status is worked out from it |
| `January` … `December` | 500 | One column per month; blank or `N/A` counts as 0 |
| `Practical Subjects` *(optional)* | 2 | Number of practical subjects; left out = 0 |

The file must be UTF-8 (Excel's "CSV UTF-8" works) and at most 5 MB. Payments are recorded for the current year. The whole file is imported in one go: either every row goes in or none do.

---

## Running it

### Requirements
- Python 3.12+ and PostgreSQL 16 (or Docker)
- Node.js 20+

### 1. API

```bash
cd api-backend
python -m venv env
env\Scripts\activate            # Windows  (macOS/Linux: source env/bin/activate)
pip install -r requirements.txt
```

Create `api-backend/.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/student-payverifier"
SECRET_KEY="a long random string"
ADMIN_USERNAME=admin
ADMIN_PASSWORD="choose a strong password"
# Optional
CORS_ORIGINS="http://localhost:3000"
COOKIE_SECURE=false           # set true when served over HTTPS
FRONTEND_URL="http://localhost:3000"
```

Create the tables and start the API:

```bash
alembic upgrade head
fastapi dev app                 # http://localhost:8000
```

Open **http://localhost:8000** for the API's index page: live status, links to the interactive docs (`/docs`), and a list of every endpoint.

**With Docker** instead: `docker compose up --build` in `api-backend/` starts PostgreSQL and the API and runs the migrations automatically. Add `DB_USER`, `DB_PASSWORD` and `DB_NAME` to `.env` for the database container.

### 2. Web app

```bash
cd frontend-web-react
npm install
npm run dev                     # http://localhost:3000
```

In development, the web app forwards `/api` requests to `http://localhost:8000`, so the sign-in cookie works with no extra setup. Set `API_URL` if the API runs somewhere else.

To build for production: `npm run build`. The output goes to `frontend-web-react/dist/`.

---

## API at a glance

All endpoints are under `/api`. Everything except sign-in and sign-out needs a signed-in user (cookie, or `Authorization: Bearer <token>`).

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/token` · `POST /auth/logout` · `GET /auth/me` |
| Register | `GET /students/register?page=&size=&q=&form=&ovc_status=&status=&sort=&order=` |
| Students | `GET /students` · `POST /students` · `GET/PUT /students/{id}` · `POST /students/upload` (CSV) |
| Payments | `GET /students/{id}/payments?year=` · `PUT /students/{id}/payments` (one month) |
| Cards | `GET /students/filter?payment_type=full\|deposit\|partial` · `POST /students/generate-cards` · `GET /students/{id}/generate-card` |
| Stats | `GET /stats/monthly?year=` |
| Tasks | `GET/POST /tasks` · `PUT/DELETE /tasks/{id}` |

Full, interactive documentation is at `http://localhost:8000/docs` while the API is running.

---

## Built with

- **API:** FastAPI, SQLModel / SQLAlchemy 2, PostgreSQL (psycopg 3), Alembic, PyJWT, ReportLab (PDF cards)
- **Web app:** React 19, TanStack Router and Query, Tailwind CSS 4, Vite, TypeScript, Biome

---

## Known limitations

- **Fees aren't tied to a year.** A student's billed, received and due figures cover every payment ever recorded, not just this year's. The monthly payment table and the chart are per year.
- **One school per installation.** School name, crest and fee amounts are set in code, not per school.
- **One kind of user.** Everyone who signs in can do everything. There are no separate roles such as bursar and administrator.

## License

See [LICENSE](LICENSE).
