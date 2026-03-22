.PHONY: test test-backend test-frontend install install-backend install-frontend \
        dev dev-frontend pipeline migrate lint

# ── Install ──────────────────────────────────────────────────────────────────

install: install-backend install-frontend

install-backend:
	cd backend && pip install -r requirements.txt

install-frontend:
	cd frontend && npm install

# ── Dev ───────────────────────────────────────────────────────────────────────

dev: dev-frontend

dev-frontend:
	cd frontend && npm run dev

# ── Test ─────────────────────────────────────────────────────────────────────

test: test-backend test-frontend

test-backend:
	cd backend && pytest tests/ -v

test-frontend:
	cd frontend && npm test

# ── Pipeline ──────────────────────────────────────────────────────────────────

pipeline:
	cd backend && python main.py run --all

pipeline-client:
	@test -n "$(client)" || (echo "Usage: make pipeline-client client=shamieh" && exit 1)
	cd backend && python main.py run --client $(client)

migrate:
	cd backend && python main.py migrate

# ── Lint ─────────────────────────────────────────────────────────────────────

lint:
	cd frontend && npm run lint
