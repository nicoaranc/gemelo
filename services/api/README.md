# Orquestador de Gemelo (`services/api`)

Recibe un ataque y una tarea, y los corre en cuatro carriles con cinco cajas: sin defensa, monitor, FIDES y Gemelo (bajo y alto). Entrega el diff del gemelo alto si pasan los tests y el escáner de secretos. Spec completo en `docs/spec-orquestador.md`.

## Correr

```bash
cd services/api
python -m venv .venv && .venv/Scripts/python -m pip install -e ".[dev]"   # en Linux: .venv/bin/python
.venv/Scripts/python -m pytest -q                 # provider falso, sin Docker ni API
make -C ../.. sandbox-image                        # imágenes gemelo-sandbox y gemelo-proxy
.venv/Scripts/python -m pytest -q -m docker        # conformidad del provider Docker
GEMELO_SANDBOX_PROVIDER=local GEMELO_AGENT=scripted .venv/Scripts/python -m uvicorn gemelo.app:app --port 8000
```

Variables con prefijo `GEMELO_`, ver `gemelo/config.py`. `GEMELO_AGENT=claude` usa Claude Code real a través del gateway (`GEMELO_GATEWAY_URL`, `GEMELO_GATEWAY_STUB=false`).

## API

| Método | Ruta | Uso |
|---|---|---|
| `GET` | `/tasks` | tareas disponibles |
| `POST` | `/runs` | `{"task_id", "attack": {"vector": "readme"|"issue"|"webpage", "payload"}}` |
| `GET` | `/runs/{id}` | estado y resultado por carril |
| `GET` | `/runs/{id}/events?after=N` | SSE, reanudable con `Last-Event-ID` |
| `GET` | `/runs/{id}/lanes/{lane}/diff` | diff; en gemelo solo si se entregó |
| `POST` | `/runs/{id}/cancel` | cancela y limpia |
| `GET` | `/queue` | cola visible |

Desde las cajas: `/hooks/{run}/{lane}/{role}/{pre,post}` y `/internal/egress` (proxy). Webhooks: `/webhooks/attacker` (HMAC `X-Gemelo-Signature`) y `/webhooks/canary/{secreto}`.

## Módulos

| Archivo | Qué hace |
|---|---|
| `runner.py` | cola, ciclo de una corrida, preparación de cajas, hooks, consolidación |
| `lanes/` | defensa de cada carril en los hooks |
| `providers/` | interfaz `SandboxProvider`; `local` (Docker), `fake` (tests), `e2b` (pendiente) |
| `accept.py` | diff, tests sin red y escaneo del diff |
| `scanner.py` | secretos en claro, base64 (3 alineaciones), hex, url, fragmentos |
| `honeytokens.py` | pools A (honeytokens) y B (sintéticos), únicos por caja |
| `handoff.py` | traspaso bajo -> alto, marcado no confiable |
| `leaks.py` | atribución de filtraciones a corrida, carril, gemelo y paso |
| `gateway_client.py` | contrato con el gateway de P2 y stub |
| `store.py` | interfaz `Store`; `MemoryStore` (P3 agrega Postgres) |
