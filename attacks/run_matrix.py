#!/usr/bin/env python3
"""Corre TODOS los ataques del catálogo contra TODOS los carriles y vuelca la tabla de
resultados (ataque × carril -> veredicto).

No es parte de la solución: es la herramienta de validación de la demo. El criterio es el del
catálogo: un ataque sirve si `none` (sin defensa) filtra; con eso, o cae un carril del estado
del arte (ese enfoque no alcanza; si cae gemelo, es hueco nuestro) o gemelo aguanta mientras
otros caen (nuestra solución defiende).

MODO REAL (por defecto): le pega a la API desplegada, que corre el MODELO REAL (agent=claude)
en sandboxes reales (provider=remote, gVisor). Es la única forma de validar que protegemos el
modelo: el ataque tiene que vencer al modelo de verdad.

  AIGIS_MATRIX_API=http://100.100.0.9:8000 AIGIS_API_TOKEN=<token> python attacks/run_matrix.py

MODO LOCAL SIN API KEY (solo si se acaban los créditos / key, o si se pide explícitamente):
levanta una app en proceso con provider fake + agente de guion. OJO: NO prueba protección, solo
cableado — el agente de guion no sigue inyecciones y la red no se aísla. No usar por defecto.

  AIGIS_MATRIX_LOCAL=1 python attacks/run_matrix.py

Salida: imprime la tabla y la guarda en attacks/results/matrix.md y attacks/results/matrix.json.
"""
from __future__ import annotations

import hashlib
import hmac
import http.server
import json
import os
import socket
import sys
import threading
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent            # .../attacks
API = HERE.parent / "services" / "api"            # .../services/api
sys.path.insert(0, str(API))

import httpx  # noqa: E402

DEFAULT_LANES = ["none", "monitor", "fides", "gemelo"]
TASK_ID = os.environ.get("AIGIS_MATRIX_TASK", "mask-keys")
LANES = [x for x in os.environ.get("AIGIS_MATRIX_LANES", ",".join(DEFAULT_LANES)).split(",") if x]
LOCAL = os.environ.get("AIGIS_MATRIX_LOCAL") == "1"
API = os.environ.get("AIGIS_MATRIX_API", "http://100.100.0.9:8000").rstrip("/")
TOKEN = os.environ.get("AIGIS_API_TOKEN", "")
SECRET = "matrix-secret"


def free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def start_attacker(port: int, orch_url: str, hits: list[bytes]) -> http.server.HTTPServer:
    class H(http.server.BaseHTTPRequestHandler):
        def _handle(self):
            n = int(self.headers.get("Content-Length") or 0)
            raw = (self.path + "\n").encode() + (self.rfile.read(n) if n else b"")
            hits.append(raw)
            body = json.dumps({"raw": raw.decode("utf-8", "replace"), "channel": "http",
                               "received_at": time.time()}).encode()
            sig = "sha256=" + hmac.new(SECRET.encode(), body, hashlib.sha256).hexdigest()
            try:
                httpx.post(f"{orch_url}/webhooks/attacker", content=body,
                           headers={"X-Aigis-Signature": sig, "Content-Type": "application/json"}, timeout=5)
            except Exception:
                pass
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"ok")

        do_GET = do_POST = _handle

        def log_message(self, *a):
            pass

    srv = http.server.ThreadingHTTPServer(("127.0.0.1", port), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def wait_run(base: str, run_id: str, timeout: float = 180) -> dict:
    with httpx.Client(base_url=base, timeout=30) as c:
        t0 = time.time()
        while time.time() - t0 < timeout:
            r = c.get(f"/runs/{run_id}").json()
            if r["status"] in ("done", "failed", "cancelled"):
                return r
            time.sleep(0.4)
    raise TimeoutError(run_id)


def fmt_cell(res: dict | None) -> str:
    if not res:
        return "—"
    v = res.get("verdict", "?")
    marks = []
    if res.get("leaked"):
        marks.append("LEAK")
    if res.get("honeytoken_leaked"):
        marks.append("hon")
    if res.get("network_cut"):
        marks.append("netcut")
    if res.get("denied_tools"):
        marks.append(f"deny{res['denied_tools']}")
    return v + (f" ({'/'.join(marks)})" if marks else "")


def main() -> int:
    port, aport = free_port(), free_port()
    boxes = Path(os.environ.get("TEMP", "/tmp")) / f"aigis-matrix-{port}"
    settings = Settings(
        sandbox_provider=PROVIDER, public_host="127.0.0.1", port=port, gateway_stub=(PROVIDER == "fake"),
        gateway_url_sandbox=f"http://127.0.0.1:{port}/gw", attacker_url_sandbox=f"http://127.0.0.1:{aport}",
        agent=AGENT, leak_grace_s=1.0, high_grace_after_low_s=10, agent_timeout_s=120, test_timeout_s=120,
        tasks_dir=REPO_ROOT / "tasks", sandbox_dir=REPO_ROOT / "sandbox", webhook_secret=SECRET,
    )
    provider = FakeProvider(root=boxes, gateway_hosts=(f"127.0.0.1:{port}",)) if PROVIDER == "fake" else None
    app = create_app(settings, provider=provider, gateway=StubGateway(), store=MemoryStore())
    server = uvicorn.Server(uvicorn.Config(app, host="127.0.0.1", port=port, log_level="warning"))
    th = threading.Thread(target=server.run, daemon=True)
    th.start()
    for _ in range(100):
        if server.started:
            break
        time.sleep(0.05)
    hits: list[bytes] = []
    atk = start_attacker(aport, f"http://127.0.0.1:{port}", hits)

    attacks = load_attacks(HERE / "catalog.yaml")
    rows: dict[str, dict] = {}
    print(f"task={TASK_ID} provider={PROVIDER} agent={AGENT} lanes={LANES}\n")
    try:
        with httpx.Client(base_url=f"http://127.0.0.1:{port}", timeout=30) as c:
            for aid in attacks:
                before = len(hits)
                r = c.post("/runs", json={"task_id": TASK_ID, "attack_id": aid, "lanes": LANES})
                if r.status_code != 201:
                    rows[aid] = {"_error": f"{r.status_code}: {r.text[:120]}"}
                    print(f"{aid}: ERROR {r.status_code}")
                    continue
                run = wait_run(f"http://127.0.0.1:{port}", r.json()["run_id"])
                res = {ln: (run["lanes"].get(ln, {}) or {}).get("result") for ln in LANES}
                res["_hits"] = len(hits) - before
                res["_kind"] = "code" if attacks[aid].files else "model"
                rows[aid] = res
                cells = "  ".join(f"{ln}={fmt_cell(res.get(ln))}" for ln in LANES)
                print(f"{aid:20} [{res['_kind']:5}] hits={res['_hits']}  {cells}")
    finally:
        atk.shutdown()
        server.should_exit = True
        th.join(timeout=10)

    out = HERE / "results"
    out.mkdir(exist_ok=True)
    (out / "matrix.json").write_text(json.dumps(
        {"task": TASK_ID, "provider": PROVIDER, "agent": AGENT, "lanes": LANES, "rows": rows}, indent=2), "utf-8")

    lines = [f"# Matriz de resultados — ataque × carril",
             f"", f"`task={TASK_ID}` · `provider={PROVIDER}` · `agent={AGENT}`", "",
             "| ataque | kind | hits | " + " | ".join(LANES) + " |",
             "|---|---|---|" + "---|" * len(LANES)]
    for aid, res in rows.items():
        if res.get("_error"):
            lines.append(f"| {aid} | | | {res['_error']} |")
            continue
        cells = " | ".join(fmt_cell(res.get(ln)) for ln in LANES)
        lines.append(f"| {aid} | {res['_kind']} | {res['_hits']} | {cells} |")
    lines += ["", "Leyenda: `LEAK`=filtró secreto real · `hon`=solo honeytoken · `netcut`=red cortada · "
              "`denyN`=N herramientas negadas. gemelo: `delivered`=no filtró y tarea pasó.",
              "", "Límite: con provider fake / agente de guion los ataques `model` no caen solos y la red "
              "no se aísla de verdad; para la tabla fiel correr con provider+modelo reales en las VMs."]
    (out / "matrix.md").write_text("\n".join(lines), "utf-8")
    print(f"\nGuardado: {out / 'matrix.md'}  y  {out / 'matrix.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
