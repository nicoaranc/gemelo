# apps/web

Next.js 15. Tiene dos partes:

- Páginas públicas de P4: `/`, `/ataca`, `/replay`, `/resultados`.
- Panel del equipo en `/panel`, detrás de contraseña: lanzar corridas, ver los 4 carriles y las 5 cajas en vivo, filtraciones atribuidas, veredictos, diff entregado, log e historial.

## Cómo habla con el orquestador

El navegador nunca llama a la API directo. `app/api/gemelo/[...path]` reenvía a `GEMELO_API_URL` con `GEMELO_API_TOKEN` desde el servidor, solo para rutas de operación (`health`, `tasks`, `queue`, `runs/...`). El SSE de `/runs/{id}/events` pasa sin buffer y con un comentario `: ping` cada 15 s para que el proxy del host no corte la conexión mientras corren tests. El cliente reconecta con `?after=<seq>`.

La sesión es una cookie httpOnly firmada con `PANEL_SECRET` (HMAC, 3 días). La revisan el middleware y el proxy. En producción, sin `PANEL_PASSWORD`, nadie entra.

## Local

```bash
cd apps/web
npm install
cp .env.example .env.local   # ajusta GEMELO_API_URL y PANEL_PASSWORD
npm run dev                  # http://localhost:3000/panel
```

Orquestador sin Docker ni API, para probar el panel:

```bash
cd services/api
GEMELO_SANDBOX_PROVIDER=fake uv run uvicorn gemelo.app:app --port 8000
```

## Render

Servicio `gemelo-web` en `render.yaml` (Node, plan starter). Variables a cargar a mano: `GEMELO_API_URL` (URL pública de `gemelo-api`) y `PANEL_PASSWORD`. `GEMELO_API_TOKEN` se copia de `gemelo-api` y `PANEL_SECRET` lo genera Render.
