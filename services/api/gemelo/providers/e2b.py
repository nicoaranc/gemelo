"""Proveedor E2B (microVMs).

Se implementa en la fase E de add-sandbox-provider (grupo 5 de tasks.md).
Red: `denyOut: 0.0.0.0/0` más `allowOut` con el gateway y la allowlist, cambiables en caliente.
"""

from __future__ import annotations

from collections.abc import AsyncIterator

from gemelo.providers import ExecEvent, NetworkProfile, Sandbox, SandboxProvider, SandboxSpec

_PENDING = "Proveedor E2B pendiente: add-sandbox-provider, grupo 5"


class E2BProvider(SandboxProvider):
    name = "e2b"

    async def create(self, spec: SandboxSpec) -> Sandbox:
        raise NotImplementedError(_PENDING)

    def exec(
        self, sb: Sandbox, cmd: list[str], *, env: dict[str, str] | None = None,
        user: str = "agent", cwd: str = "/workspace", timeout: float | None = None,
    ) -> AsyncIterator[ExecEvent]:
        raise NotImplementedError(_PENDING)

    async def write_files(self, sb: Sandbox, files: dict[str, bytes | str], mode: int = 0o644,
                          owner: str = "agent") -> None:
        raise NotImplementedError(_PENDING)

    async def read_file(self, sb: Sandbox, path: str) -> bytes:
        raise NotImplementedError(_PENDING)

    async def list_dir(self, sb: Sandbox, path: str) -> list[str]:
        raise NotImplementedError(_PENDING)

    async def set_network(self, sb: Sandbox, network: NetworkProfile) -> None:
        raise NotImplementedError(_PENDING)

    async def destroy(self, sb: Sandbox) -> None:
        raise NotImplementedError(_PENDING)

    async def list(self, run_id: str | None = None) -> list[Sandbox]:
        return []
