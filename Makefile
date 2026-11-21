.PHONY: up down test eval sandbox-image

SANDBOX_IMAGE ?= gemelo-sandbox:local

sandbox-image:
	docker build -t $(SANDBOX_IMAGE) sandbox

up:
	docker compose up --build

down:
	docker compose down

test:
	cd services/api && uv run pytest

eval:
	python eval/run_eval.py
