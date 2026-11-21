.PHONY: up down test test-docker eval sandbox-image api

up:
	docker compose up --build

down:
	docker compose down

# Imágenes del provider local: sandbox (Claude Code + hooks) y proxy de salida
sandbox-image:
	docker build -t gemelo-sandbox:dev sandbox
	docker build -t gemelo-proxy:dev egress_proxy

# Orquestador en local. GEMELO_SANDBOX_PROVIDER=local usa Docker; fake no aísla nada.
api:
	cd services/api && python -m uvicorn gemelo.app:app --port 8000

test:
	cd services/api && python -m pytest -q

test-docker: sandbox-image
	cd services/api && python -m pytest -q -m docker

eval:
	python eval/run_eval.py
