# Fee Payment System — API

The API behind the Mliba High School fee register. It stores students and their monthly payments, works out each student's fee, amount paid and balance, imports students from CSV, generates printable PDF payment cards, and serves the data the web app needs (a paginated fee register, monthly receipts, tasks).

Built with FastAPI, SQLModel / SQLAlchemy 2, PostgreSQL (psycopg 3), Alembic, PyJWT and ReportLab.

For everything the app can do, how fees are calculated and the CSV format, see the [main README](../README.md).

## Run it

```bash
python -m venv env
env\Scripts\activate            # Windows  (macOS/Linux: source env/bin/activate)
pip install -r requirements.txt
```

Create `.env` in this folder:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/student-payverifier"
SECRET_KEY="a long random string"
ADMIN_USERNAME=admin
ADMIN_PASSWORD="choose a strong password"
# Optional
CORS_ORIGINS="http://localhost:3000"
COOKIE_SECURE=false             # true when served over HTTPS
FRONTEND_URL="http://localhost:3000"
ACCESS_TOKEN_MAX_AGE=43200      # sign-in lifetime in seconds (default 12 hours)
```

```bash
alembic upgrade head            # create / update tables
fastapi dev app                 # http://localhost:8000, reloads on save
```

On first start, an admin user is created from `ADMIN_USERNAME` / `ADMIN_PASSWORD` if the database has no users yet.

- **http://localhost:8000:** index page with live API and database status, plus every endpoint
- **http://localhost:8000/docs:** interactive docs. Click **Authorize** to try the protected endpoints
- **http://localhost:8000/health:** JSON health check (`503` if the database is down)

### Docker

```bash
docker compose up --build
```

This starts PostgreSQL 16 and the API, and runs `alembic upgrade head` on start (see `entrypoint.sh`). Add `DB_USER`, `DB_PASSWORD` and `DB_NAME` to `.env` for the database container, and point `DATABASE_URL` at host `db`.

## Project layout

```
app/
  __init__.py      FastAPI app, CORS, index page and /health
  router.py        all /api routes (public: auth; everything else requires sign-in)
  services.py      the logic: register paging, payments, CSV import, cards, tasks
  models.py        tables: User, Student, Payment, Task (fees are computed here)
  schemas.py       request/response models
  auth.py          sign-in; reads the token from the cookie or Authorization header
  tokens.py        JWT create / verify
  constants.py     fee amounts, card size, bank account number
  seed.py          creates the first admin user
  utils/           PDF payment cards (ReportLab), QR code helper
  templates/       index page
  static/images/   school crest
migrations/        Alembic migrations
```

## Changing the database

1. Edit the models in `app/models.py`.
2. `alembic revision --autogenerate -m "what changed"`
3. **Read the generated file.** When adding a `NOT NULL` column to a table that already has rows, give it a `server_default`, or the upgrade will fail.
4. `alembic upgrade head`

## Fee rules

Base fee by OVC status, plus a charge per practical subject, set in `app/constants.py`. **Due** = fee − all payments. The calculation is the `amount_to_pay` property in `app/models.py`, and every endpoint uses it.
