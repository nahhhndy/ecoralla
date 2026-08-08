.PHONY: help install dev-backend dev-frontend test lint clean docker-up docker-down

help:
	@echo "EcoRal Platform — Development Commands"
	@echo ""
	@echo "  make install          Install all dependencies (backend + frontend)"
	@echo "  make dev-backend      Start FastAPI backend (uvicorn --reload)"
	@echo "  make dev-frontend     Start Next.js frontend (npm run dev)"
	@echo "  make test             Run all backend tests with coverage"
	@echo "  make lint             Run ruff linter"
	@echo "  make docker-up        Start full stack (PostgreSQL + Redis + API + Frontend)"
	@echo "  make docker-down      Stop all Docker services"
	@echo "  make migrate          Run Alembic migrations"
	@echo "  make clean            Remove cache files"

install:
	pip install -r backend/requirements.txt
	pip install -r requirements.txt
	cd frontend && npm install

dev-backend:
	uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend:
	cd frontend && npm run dev

dev:
	@echo "Start backend in one terminal: make dev-backend"
	@echo "Start frontend in another:    make dev-frontend"

test:
	pytest tests/ -v --cov=src --cov=backend --cov-report=term-missing

lint:
	ruff check src/ backend/ tests/

migrate:
	alembic -c backend/alembic.ini upgrade head

migrate-create:
	alembic -c backend/alembic.ini revision --autogenerate -m "$(msg)"

docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-build:
	docker compose build

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.pyc" -delete 2>/dev/null || true
	rm -rf .pytest_cache htmlcov .coverage 2>/dev/null || true
