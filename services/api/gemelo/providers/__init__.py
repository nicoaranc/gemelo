"""Proveedores de sandbox: interfaz única, perfiles de red y fábrica.

El orquestador solo usa esta interfaz. `local` (Docker) y `e2b` la implementan;
`fake` corre cada caja como carpeta y procesos en el host, para tests sin Docker
(no aísla nada: la red se simula en el agente con guion).
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from typing import Literal, Protocol

NetKind = Literal["open", "isolated", "gateway_only"]
VALID_PROVIDERS = ("local", "e2b", "fake")


@dataclass(frozen=True)
class NetworkProfile:
    kind: NetKind
    allowlist: tuple[str, ...] = ()

    @staticmethod
    def open() -> NetworkProfile:
        return NetworkProfile("open")

    @staticmethod
    def isolated(allowlist: list[str] | tuple[str, ...]) -> NetworkProfile:
        return NetworkProfile("isolated", tuple(allowlist))

    @staticmethod
    def gateway_only() -> NetworkProfile:
        return NetworkProfile("gateway_only")

    def label(self) -> str:
        return self.kind if not self.allowlist else f"{self.kind}({','.join(self.allowlist)})"


@dataclass
class SandboxSpec:
    run_id: str
    lane: str
    role: str
    network: NetworkProfile
    template: str = "gemelo-sandbox:dev"
    env: dict[str, str] = field(default_factory=dict)
    cpus: float = 1.0
    memory_mb: int = 2048
    ttl_s: int = 1800


@dataclass
class Sandbox:
    id: str
    spec: SandboxSpec
    ip: str | None = None
    network: NetworkProfile | None = None


@dataclass
class ExecEvent:
    stream: Literal["stdout", "stderr", "exit"]
    data: str


@dataclass
class ExecResult:
    exit_code: int
    stdout: str
    stderr: str


class SandboxProvider(Protocol):
    name: str

    async def create(self, spec: SandboxSpec) -> Sandbox: ...

    def exec(
        self, sb: Sandbox, cmd: list[str], *, env: dict[str, str] | None = None,
        user: str = "agent", cwd: str = "/workspace", timeout: float | None = None,
    ) -> AsyncIterator[ExecEvent]: ...

    async def write_files(self, sb: Sandbox, files: dict[str, bytes | str], mode: int = 0o644,
                          owner: str = "agent") -> None: ...

    async def read_file(self, sb: Sandbox, path: str) -> bytes: ...

    async def list_dir(self, sb: Sandbox, path: str) -> list[str]: ...

    async def set_network(self, sb: Sandbox, profile: NetworkProfile) -> None: ...

    async def destroy(self, sb: Sandbox) -> None: ...

    async def list(self, run_id: str | None = None) -> list[Sandbox]: ...


async def run(provider: SandboxProvider, sb: Sandbox, cmd: list[str], **kw) -> ExecResult:
    """Ejecuta y junta la salida. Para comandos cortos del orquestador."""
    out, err, code = [], [], -1
    async for ev in provider.exec(sb, cmd, **kw):
        if ev.stream == "stdout":
            out.append(ev.data)
        elif ev.stream == "stderr":
            err.append(ev.data)
        else:
            code = int(ev.data)
    return ExecResult(code, "\n".join(out), "\n".join(err))


class ProviderTimeout(asyncio.TimeoutError):
    pass


def get_provider(name: str, **kw) -> SandboxProvider:
    if name == "local":
        from .local import DockerProvider

        return DockerProvider(**kw)
    if name == "e2b":
        from .e2b import E2BProvider

        return E2BProvider(**kw)
    if name == "fake":
        from .fake import FakeProvider

        return FakeProvider(**kw)
    raise ValueError(f"SANDBOX_PROVIDER inválido: {name!r}. Valores válidos: {', '.join(VALID_PROVIDERS)}")
