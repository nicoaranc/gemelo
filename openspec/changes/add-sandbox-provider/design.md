# Design

## Context

Ver proposal.md (Why). Render no permite contenedores privilegiados ni Docker dentro de Docker, así que en producción los sandboxes no pueden correr junto al orquestador: van en E2B. En local sí hay Docker. Hoy existen solo stubs en `services/api/gemelo/providers/` y un `sandbox/Dockerfile` basado en `python:3.12-slim` sin Node ni Claude Code.

## Goals / Non-Goals

**Goals:**
- Una interfaz pequeña que cubra todo lo que necesitan los carriles: crear, ejecutar, leer, cambiar red, destruir.
- Aislamiento de red aplicado por la infraestructura (red Docker o reglas de E2B), nunca por el agente.
- La misma suite de conformidad para ambos proveedores.

**Non-Goals:**
- Lógica de carriles o de gemelos (es de `add-twin-execution` y `add-baseline-lanes`).
- La desclasificación hacia destinos de la allowlist con el valor real (`add-declassification`); aquí solo existe la allowlist como lista de destinos.
- Modal como proveedor. Solo se agrega si el spike de E2B falla en F0.

## Decisions

**Interfaz `SandboxProvider`.** Operaciones: `create(template, task_repo, network) -> Sandbox`, `exec(sandbox, cmd) -> stream`, `read_file`, `git_diff`, `set_network(sandbox, profile)`, `destroy`. Se elige con una fábrica que lee `SANDBOX_PROVIDER`. Alternativa descartada: un adaptador por carril; duplicaría la lógica de red.

**Decisiones de la interfaz que no están en el memo** (tomadas al implementar el grupo 2):
- Si `SANDBOX_PROVIDER` no está definida o está vacía, se usa `local`. El spec solo exige fallar con un valor inválido, y `local` es lo seguro para desarrollar.
- Se agrega `destroy_run(run_id)`: destruye todos los sandboxes de una corrida por su etiqueta, para cumplir la limpieza garantizada aunque el proceso que los creó haya caído.
- `exec` entrega eventos `ExecOutput` (stdout o stderr) y termina con un `ExecExit` con el código de salida.
- La fábrica importa cada proveedor solo al elegirlo, para que en local no se necesite la key de E2B.

**Perfiles de red como valores, no flags.** `open`, `isolated(allowlist)` y `gateway_only`. `gateway_only` es `isolated` con allowlist vacía y es el destino del corte en caliente de FIDES (D5).

**Local: dos redes Docker.** `egress` (bridge normal) e `internal` (`internal: true`). El gateway está conectado a ambas. Un sandbox aislado solo se conecta a `internal`. Para el corte en caliente se desconecta el contenedor de `egress` y se conecta a `internal` (`docker network disconnect/connect`), lo que no reinicia el contenedor. La allowlist en local se resuelve con un proxy de salida en la red `internal` que solo reenvía a los dominios permitidos. Alternativa descartada: iptables dentro del contenedor, porque el agente podría modificarlas si tiene privilegios.

**E2B: reglas de salida del sandbox.** `denyOut: 0.0.0.0/0` más `allowOut` con el gateway y la allowlist; las reglas se pueden cambiar con el sandbox corriendo, lo que cubre el corte en caliente.

**Plantilla única.** `sandbox/Dockerfile` pasa a Node 22 con Claude Code, git y Python 3.12, y copia los hooks. En E2B se construye una plantilla equivalente desde el mismo Dockerfile. `make sandbox-image` construye la local.

**Decisiones de la plantilla que no están en el memo** (tomadas al implementar el grupo 1):
- Base `python:3.12-slim-bookworm` con Node 22 copiado desde `node:22-bookworm-slim`: Debian bookworm no trae Python 3.12.
- Claude Code fijado con `ARG CLAUDE_CODE_VERSION` (2.1.330), para que todo el equipo y E2B usen la misma versión.
- El agente corre como usuario sin privilegios `agent`, para que no pueda cambiar rutas, DNS ni firewall desde adentro (escenario "El agente no puede abrir la red").
- `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1` y `DISABLE_AUTOUPDATER=1` en la imagen. El memo dejaba la primera como candidata a confirmar en el spike del gateway (tarea 6.1 de `add-model-gateway`).
- `curl` incluido, para el spike y los tests de red.
- `pytest` preinstalado (fijado a la versión de `services/api/uv.lock`): los tests de la tarea corren dentro del sandbox con la red cortada y no se pueden instalar en ese momento. Si una tarea necesita más dependencias, se resolverá en `add-task-fixtures`.

**Limpieza garantizada.** El orquestador registra cada sandbox por corrida y los destruye en un `finally`; además, cada sandbox nace con una etiqueta de corrida y un timeout máximo (menor que 1 h en E2B) para que un proceso caído no deje sandboxes huérfanos.

**Suite de conformidad parametrizada.** Tests pytest en `services/api/tests/` marcados por proveedor; `make test` corre `local` por defecto, y `SANDBOX_PROVIDER=e2b make test` corre la misma suite contra E2B.

## Risks / Trade-offs

- [El spike de E2B falla (red, latencia o Claude Code)] → decidir en h10 el cambio a Modal, como dice el plan.
- [Mantener dos proveedores consume el tiempo de P1] → decisión D6: criterio de corte en h16. Si E2B no pasa la suite, solo el carril Gemelo corre en E2B y el resto queda en local con replay.
- [Límite de 10 sandboxes simultáneos en E2B; una corrida completa usa 5] → la cola visible se resuelve en `add-playground-web`; aquí el proveedor expone el error de cuota de forma explícita.
- [El proxy de allowlist local se comporta distinto a E2B] → la suite de conformidad prueba el comportamiento observable, no el mecanismo.
- [Diferencia de rendimiento entre Docker y microVM] → no afecta a los requisitos; se mide en F4.

## Open Questions

- Dominio y forma exacta en que el sandbox alcanza al gateway en E2B (URL pública del servicio en Render con token por corrida, ver `add-model-gateway`). Se confirma en el spike de P2.
