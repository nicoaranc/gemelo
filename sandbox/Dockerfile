# Plantilla del sandbox donde corre el agente (local con Docker; E2B parte del mismo archivo).
# Contiene: Node 22, Claude Code, git, Python 3.12, pytest, curl y los hooks del agente.
# No contiene ninguna API key ni credencial del orquestador.

FROM node:22-bookworm-slim AS node

FROM python:3.12-slim-bookworm

ARG CLAUDE_CODE_VERSION=2.1.330

# Node 22 (binario y npm) desde la imagen oficial
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
 && ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

RUN apt-get update \
 && apt-get install -y --no-install-recommends git curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

RUN npm install -g "@anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}" \
 && npm cache clean --force

# pytest preinstalado: los tests de la tarea corren dentro del sandbox con la red cortada
ARG PYTEST_VERSION=9.2.0
RUN pip install --no-cache-dir "pytest==${PYTEST_VERSION}"

# Claude Code no debe hablar con nada salvo el gateway
ENV CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1 \
    DISABLE_AUTOUPDATER=1

# Usuario sin privilegios: el agente no puede tocar la red ni el sistema
RUN useradd --create-home --shell /bin/bash agent \
 && mkdir -p /workspace \
 && chown agent:agent /workspace

COPY hooks/ /opt/hooks/
COPY scripted_agent.py /opt/scripted_agent.py
RUN chmod -R a+rx /opt/hooks

USER agent
WORKDIR /workspace
RUN git config --global user.name "agent" \
 && git config --global user.email "agent@sandbox.local" \
 && git config --global init.defaultBranch main
