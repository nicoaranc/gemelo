.PHONY: up down test eval

up:
	docker compose up --build

down:
	docker compose down

test:
	cd services/api && uv run pytest

eval:
	python eval/run_eval.py
