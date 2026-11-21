# apps/web

Next.js 15 con React 19, Tailwind v4 y shadcn/ui. Spec: `openspec/changes/add-playground-web/`.

## Páginas

| Ruta | Acceso | Qué es |
|---|---|---|
| `/` | Público | Landing: la tesis, el diagrama de los dos gemelos, los cuatro carriles y lo que no cubre |
| `/ataca` | Público | Galería de corridas grabadas. Con sesión, además, el formulario para lanzar en vivo |
| `/replay/[id]` | Público | Reproduce una grabación sin API ni sesión (`/replay` redirige a `/ataca`) |
| `/resultados` | Público | Tabla y gráfico desde `public/results/summary.json` |
| `/login` | Público | Contraseña del equipo |
| `/panel` | Sesión | Salud del orquestador, lanzar, cola, historial y comando para grabar una corrida |
| `/runs/[id]` | Sesión | Corrida en vivo (`/panel/runs/[id]` redirige aquí) |

La vista de corrida (`components/run/run-view.tsx`) es la misma para vivo y grabación: solo recibe `run`, `events` y `diffs`.

## Cómo habla con el orquestador

El navegador nunca llama a la API directo. `app/api/gemelo/[...path]` reenvía a `GEMELO_API_URL` con `GEMELO_API_TOKEN` desde el servidor, solo para rutas de operación (`health`, `tasks`, `queue`, `runs/...`). El SSE de `/runs/{id}/events` pasa sin buffer y con un comentario `: ping` cada 15 s. El cliente reconecta con `?after=<seq>` (`hooks/useRunStream.ts`).

Después del fin de una corrida, `/runs/[id]` sigue pidiendo eventos nuevos cada 20 s durante 10 min: las alertas de canary llegan tarde (`leak.detected` con `source: "canary"` y `late: true`) y recalculan los veredictos.

La sesión es una cookie httpOnly firmada con `PANEL_SECRET` (HMAC, 3 días). La revisan el middleware y el proxy; `/ataca` la revisa en el servidor. En producción, sin `PANEL_PASSWORD`, nadie entra. En desarrollo, sin `PANEL_PASSWORD`, todo queda abierto.

## Grabaciones

Una grabación es un JSON estático en `public/replays/<id>.json` con el run final, todos los eventos y el diff de cada carril. No confundir con el modo `replay` del gateway, que reejecuta desde `cassettes/` y necesita la API.

```bash
# desde la raíz, con la API corriendo y la corrida terminada
make export-run RUN=<run_id> WAIT=2m ID=base64-readme TITLE="Ataque en base64 escondido en el README"
```

- `WAIT` espera antes de leer para capturar alertas de canary tardías.
- El script también actualiza `public/replays/index.json`, que es la galería de `/ataca`. `TEST=1` marca la grabación como prueba: se ve en desarrollo, no en producción.
- Cada grabación nueva exige redeploy. Curarlas antes del freeze de h30.

## Resultados

`/resultados` lee `public/results/summary.json`. El contrato está en `lib/results.ts` (lo genera `eval/run_eval.py`):

```json
{
  "generated_at": "2026-11-21T20:00:00Z",
  "model": "claude-haiku-5-5",
  "attack_labels": { "base64": "Base64" },
  "cells": [
    { "lane": "gemelo", "attack": "base64", "n": 10, "leaks": 0, "honey_leaks": 7,
      "tests_passed": 8, "cost_usd": 0.04, "latency_s": 95 }
  ]
}
```

Una celda por carril y tipo de ataque. `n`, `leaks`, `honey_leaks` y `tests_passed` son conteos de corridas; `cost_usd` y `latency_s` son promedios por corrida. Sin el archivo, la página muestra un estado vacío.

## Local

```bash
# orquestador sin Docker ni API de Anthropic (el agente con guion no intenta filtrar)
cd services/api && GEMELO_SANDBOX_PROVIDER=fake uv run uvicorn gemelo.app:app --port 8000

# web
cd apps/web
npm ci
cp .env.example .env.local   # ajusta GEMELO_API_URL, PANEL_PASSWORD y PANEL_SECRET
npm run dev                  # http://localhost:3000
```

No corras `npm run build` con `npm run dev` abierto: comparten `.next` y el servidor de desarrollo empieza a fallar.

Para probar una alerta de canary tardía en local:

1. Crea `secrets/canaries.json` en la raíz (está en `.gitignore`) con entradas como `{"canary_id": "test-1", "value": "AKIA…", "env_name": "AWS_ACCESS_KEY_ID"}` y reinicia la API. Sin ese archivo los honeytokens no tienen `canary_id` y el webhook no encuentra nada.
2. Con la corrida terminada y `/runs/<id>` abierta: `curl -X POST localhost:8000/webhooks/canary/dev-webhook-secret -H 'content-type: application/json' -d '{"canary_id":"test-1"}'`. La URL lleva el secreto de webhooks de la API, no el valor del token.

## Estilos

Tokens en `app/globals.css`. Además de los de shadcn hay tokens del dominio, separados del acento: `leak` (llave real filtrada), `honey` (honeytoken capturado), `safe` (entregado sin filtrar), `blocked` (bloqueado o red cortada), `tainted` (contexto contaminado), `terminal` (fondo de las cajas) y `chart-1` (serie de gráficos). Tema oscuro por defecto.

## Render

Servicio `gemelo-web` en `render.yaml` (Node, plan starter). Corre `npm ci && npm run build`. Variables a cargar a mano: `GEMELO_API_URL` (URL pública de `gemelo-api`) y `PANEL_PASSWORD`. `GEMELO_API_TOKEN` se copia de `gemelo-api` y `PANEL_SECRET` lo genera Render.
