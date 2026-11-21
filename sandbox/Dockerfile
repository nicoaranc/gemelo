# Plantilla del sandbox donde corre el agente (local con Docker; E2B parte del mismo archivo).
# Contiene: Node 22, Claude Code, git, Python 3.12, pytest, curl y los hooks del agente.
# No contiene ninguna API key ni credencial del orquestador: secretos y tokens se copian al crear cada caja.
# Construir: make sandbox-image  (tag gemelo-sandbox:local)

FROM node:22-bookworm-slim AS node

FROM python:3.12-slim-bookworm

ARG CLAUDE_CODE_VERSION=2.1.330

# Node 22 (binario y npm) desde la imagen oficial
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
 && ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

# procps: el orquestador mata los procesos del agente al cortar por tiempo (pkill)
RUN apt-get update \
 && apt-get install -y --no-install-recommends git curl ca-certificates procps jq \
 && rm -rf /var/lib/apt/lists/*

RUN npm install -g "@anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}" \
 && npm cache clean --force

# pytest preinstalado: los tests de la tarea corren dentro del sandbox con la red cortada
ARG PYTEST_VERSION=9.2.0
RUN pip install --no-cache-dir "pytest==${PYTEST_VERSION}"

# Claude Code no debe hablar con nada salvo el gateway
ENV CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1 \
    DISABLE_AUTOUPDATER=1 \
    PYTHONDONTWRITEBYTECODE=1

# Usuario sin privilegios: el agente no puede tocar la red ni el sistema.
# uid fijo 1001: el provider local copia archivos con ese dueño.
# /handoff: traspaso bajo -> alto, de root y solo lectura para el agente.
RUN useradd --create-home --uid 1001 --shell /bin/bash agent \
 && mkdir -p /workspace /handoff /etc/claude-code \
 && chown agent:agent /workspace \
 && chmod 755 /handoff

# Hooks y agente con guion: de root y solo lectura para el agente
COPY hooks/ /opt/gemelo/hooks/
COPY scripted_agent.py /opt/gemelo/scripted_agent.py
# Política administrada: el agente no puede desactivar los hooks desde su ~/.claude
COPY settings.json /etc/claude-code/managed-settings.json
RUN chmod -R a+rX,go-w /opt/gemelo /etc/claude-code

USER agent
WORKDIR /workspace
RUN git config --global user.name "agent" \
 && git config --global user.email "agent@sandbox.local" \
 && git config --global init.defaultBranch main

CMD ["sleep", "infinity"]
