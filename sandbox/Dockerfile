# Plantilla del sandbox de Gemelo: Node 22, Claude Code, git, Python y los hooks.
# Construir desde la raíz del repo:  docker build -t gemelo-sandbox:dev sandbox
# Sin secretos: ni API keys, ni pools, ni tokens. Se copian al crear cada caja.
FROM node:22-bookworm-slim

ARG CLAUDE_CODE_VERSION=2.1.330

RUN apt-get update && apt-get install -y --no-install-recommends \
      git python3 python3-pytest python3-venv curl jq ca-certificates procps bash \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g @anthropic-ai/claude-code@${CLAUDE_CODE_VERSION} \
    && npm cache clean --force

# Usuario sin privilegios. --dangerously-skip-permissions no corre como root.
RUN useradd -m -u 1001 -s /bin/bash agent \
    && mkdir -p /workspace /handoff /etc/claude-code \
    && chown agent:agent /workspace \
    && chmod 755 /handoff

# Hooks y agente con guion: de root y solo lectura para el agente
COPY hooks/ /opt/gemelo/hooks/
COPY scripted_agent.py /opt/gemelo/scripted_agent.py
# Política administrada: el agente no puede desactivar los hooks desde su ~/.claude
COPY settings.json /etc/claude-code/managed-settings.json
RUN chmod -R a+rX,go-w /opt/gemelo /etc/claude-code && ln -sf /usr/bin/python3 /usr/local/bin/python

ENV DISABLE_AUTOUPDATER=1 \
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /workspace
CMD ["sleep", "infinity"]
