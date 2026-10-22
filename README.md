# InvoiceFlow

Invoice and document processing platform: upload invoices, extract the data with an LLM in background workers, review and correct it, and report on spend by supplier and month.

**Status:** step 1 of 8 (foundation). Backend schema, migrations, first API endpoints and tests.

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

## Roadmap
1. Foundation (this step) 2. Auth and roles 3. React + TypeScript frontend 4. CI/CD with GitHub Actions 5. AWS with Terraform 6. Logging, metrics, alerts, load test 7. Upload + LLM extraction with background jobs 8. Polish and write-up
