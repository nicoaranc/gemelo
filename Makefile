.PHONY: up down test eval

up:
	docker compose up --build

down:
	docker compose down

test:
	cd services/api && python -m pytest

eval:
	python eval/run_eval.py
