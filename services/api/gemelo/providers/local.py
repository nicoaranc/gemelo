"""Proveedor local (Docker).

Se implementa en la fase C de add-sandbox-provider (grupo 3 de tasks.md).
"""

from __future__ import annotations

from collections.abc import Iterator, Mapping
from pathlib import Path

from gemelo.providers import ExecEvent, NetworkProfile, Sandbox, SandboxProvider

_PENDING = "Proveedor local pendiente: add-sandbox-provider, grupo 3"


class LocalProvider(SandboxProvider):
    name = "local"

    def create(
        self,
        template: str,
        task_repo: Path,
        network: NetworkProfile,
        run_id: str,
        labels: Mapping[str, str] | None = None,
    ) -> Sandbox:
        raise NotImplementedError(_PENDING)

    def exec(self, sandbox: Sandbox, cmd: str) -> Iterator[ExecEvent]:
        raise NotImplementedError(_PENDING)

    def read_file(self, sandbox: Sandbox, path: str) -> bytes:
        raise NotImplementedError(_PENDING)

    def git_diff(self, sandbox: Sandbox) -> str:
        raise NotImplementedError(_PENDING)

    def set_network(self, sandbox: Sandbox, network: NetworkProfile) -> None:
        raise NotImplementedError(_PENDING)

    def destroy(self, sandbox: Sandbox) -> None:
        raise NotImplementedError(_PENDING)

    def destroy_run(self, run_id: str) -> None:
        raise NotImplementedError(_PENDING)
