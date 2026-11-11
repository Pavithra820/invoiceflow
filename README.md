# InvoiceFlow

Invoice and document processing platform: upload invoices, extract the data with an LLM in background workers, review and correct it, and report on spend by supplier and month.

**Status:** step 4 of 8 (CI/CD with GitHub Actions).

## Stack
Python, FastAPI, PostgreSQL, SQLAlchemy 2.0, Alembic, Docker Compose, pytest. (Planned: React + TypeScript, GitHub Actions, AWS + Terraform, monitoring, LLM extraction.)

## Run locally
```bash
cp .env.example .env
docker compose up --build
# API docs: http://localhost:8000/docs
# Health:   http://localhost:8000/health
```

## Run the tests
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
pytest
```

## Design decisions
- **Money is `Numeric(12,2)`, never float.** Line amounts are computed on the server and must add up to the invoice total.
- **Unique `(supplier_id, invoice_number)`** stops duplicate imports at the database level, and the API returns 409.
- **Indexes** on `status` and `(supplier_id, issue_date)` for the list and reporting queries.
- **Migrations with Alembic**, applied automatically when the container starts.
- **Liveness and readiness endpoints** (`/health`, `/health/ready`) for orchestration and monitoring.

## Authentication and roles (step 2)
- Passwords are hashed with bcrypt and never stored or returned in plain text.
- Login returns a short-lived JWT (30 minutes). The token holds only the user id; the role is read from the database on each request, so role changes apply immediately.
- Roles: **viewer** (read), **reviewer** (read and create invoices), **admin** (everything, plus user and role management).
- The first account registered becomes the admin. Later accounts start as viewers. An admin cannot change their own role, so the last admin cannot lock everyone out.
- Wrong password and unknown email return the same error, and take similar time.
- Set `SECRET_KEY` in `.env` to a long random value before any real deployment.

Try it in Swagger (`/docs`): register, click **Authorize**, enter your email as the username and your password, then call the invoice endpoints.

## Frontend (step 3)
React 18, TypeScript (strict), Vite, React Router, Vitest and Testing Library.

```bash
# the backend must be running first: docker compose up
cd frontend
npm install
npm run dev        # http://localhost:5173
npm test           # unit and component tests
npm run build      # type-check and production build
```

- In development, Vite forwards `/api/...` to the backend on port 8000, so no CORS setup is needed.
- Pages: sign in and register, paginated invoice list with status and supplier filters, invoice detail, and a create form with line items. The form checks the same rules as the backend before sending, and the backend still enforces them.
- Money is handled as integer cents in the browser, and as strings from the API, never as floating point.
- The create button and form are hidden or blocked for viewers. This is a convenience only: the API enforces the roles.
- The token is kept in `sessionStorage` so a refresh does not log you out. A production system would prefer an httpOnly cookie, because script-readable storage is exposed to XSS.

## CI/CD (step 4)
Every push to `main` and every pull request runs `.github/workflows/ci.yml`:

1. **Backend:** lint with Ruff, apply the Alembic migrations to a real PostgreSQL service, check that the models and migrations agree (`alembic check`), run all tests against PostgreSQL, then prove the migrations can be reversed and re-applied.
2. **Frontend:** `npm ci`, run the tests, type-check and build.
3. **Docker:** build the whole stack with Docker Compose, wait for the health checks, and run `scripts/smoke_test.sh` (health, login, create and list an invoice).

Dependabot opens weekly pull requests for outdated dependencies. Locally, `pytest` still uses fast in-memory SQLite; set `TEST_DATABASE_URL` to run the same tests on PostgreSQL.

## Roadmap
1. Foundation (this step) 2. Auth and roles 3. React + TypeScript frontend 4. CI/CD with GitHub Actions 5. AWS with Terraform 6. Logging, metrics, alerts, load test 7. Upload + LLM extraction with background jobs 8. Polish and write-up
