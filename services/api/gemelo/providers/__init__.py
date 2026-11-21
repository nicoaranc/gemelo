"""Proveedores de sandbox.

Interfaz única que el orquestador usa para crear sandboxes, ejecutar comandos,
leer resultados, cambiar la red y destruirlos, sin saber si detrás hay Docker
(local) o E2B. Se elige con la variable SANDBOX_PROVIDER.
"""

from __future__ import annotations

import os
from abc import ABC, abstractmethod
from collections.abc import Iterator, Mapping
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal

VALID_PROVIDERS = ("local", "e2b")
DEFAULT_PROVIDER = "local"


# --- Perfiles de red -------------------------------------------------------


@dataclass(frozen=True)
class NetworkProfile:
    """Política de red de un sandbox.

    - open: salida libre a internet.
    - isolated: solo el gateway del modelo y los dominios de la allowlist.
      Con la allowlist vacía es "solo gateway".
    """

    kind: Literal["open", "isolated"]
    allowlist: frozenset[str] = frozenset()

    def __post_init__(self) -> None:
        if self.kind == "open" and self.allowlist:
            raise ValueError("El perfil abierto no lleva allowlist")

    @property
    def is_gateway_only(self) -> bool:
        return self.kind == "isolated" and not self.allowlist


def open_network() -> NetworkProfile:
    return NetworkProfile("open")


def isolated(allowlist: list[str] | tuple[str, ...] | frozenset[str] = ()) -> NetworkProfile:
    return NetworkProfile("isolated", frozenset(allowlist))


def gateway_only() -> NetworkProfile:
    """Destino del corte de red en caliente (decisión D5: todo menos el gateway)."""
    return isolated()


# --- Sandbox y ejecución ---------------------------------------------------


@dataclass(frozen=True)
class Sandbox:
    """Referencia a un sandbox creado por un proveedor."""

    id: str
    run_id: str
    provider: str
    labels: Mapping[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class ExecOutput:
    """Fragmento de salida de un comando en ejecución."""

    stream: Literal["stdout", "stderr"]
    data: str


@dataclass(frozen=True)
class ExecExit:
    """Último evento de un comando: su código de salida."""

    exit_code: int


ExecEvent = ExecOutput | ExecExit


# --- Errores ---------------------------------------------------------------


class ProviderError(Exception):
    """Error de un proveedor de sandboxes."""


class UnknownProviderError(ProviderError):
    """SANDBOX_PROVIDER tiene un valor que no corresponde a ningún proveedor."""


class QuotaExceededError(ProviderError):
    """El proveedor rechazó crear un sandbox por límite de cuota."""


# --- Interfaz --------------------------------------------------------------


class SandboxProvider(ABC):
    """Operaciones que todo proveedor de sandboxes debe implementar."""

    name: str

    @abstractmethod
    def create(
        self,
        template: str,
        task_repo: Path,
        network: NetworkProfile,
        run_id: str,
        labels: Mapping[str, str] | None = None,
    ) -> Sandbox:
        """Crea un sandbox desde la plantilla, con el repo de la tarea y la red indicada."""

    @abstractmethod
    def exec(self, sandbox: Sandbox, cmd: str) -> Iterator[ExecEvent]:
        """Ejecuta un comando y entrega su salida en streaming; el último evento es ExecExit."""

    @abstractmethod
    def read_file(self, sandbox: Sandbox, path: str) -> bytes:
        """Lee un archivo del sandbox."""

    @abstractmethod
    def git_diff(self, sandbox: Sandbox) -> str:
        """Devuelve el git diff del repo de la tarea dentro del sandbox."""

    @abstractmethod
    def set_network(self, sandbox: Sandbox, network: NetworkProfile) -> None:
        """Cambia la red de un sandbox en ejecución sin reiniciarlo ni perder su estado."""

    @abstractmethod
    def destroy(self, sandbox: Sandbox) -> None:
        """Destruye un sandbox."""

    @abstractmethod
    def destroy_run(self, run_id: str) -> None:
        """Destruye todos los sandboxes de una corrida, aunque el proceso que los creó haya caído."""


# --- Fábrica ---------------------------------------------------------------


def get_provider(env: Mapping[str, str] | None = None) -> SandboxProvider:
    """Devuelve el proveedor indicado por SANDBOX_PROVIDER (por defecto, local)."""
    env = os.environ if env is None else env
    value = env.get("SANDBOX_PROVIDER", "").strip().lower() or DEFAULT_PROVIDER

    if value == "local":
        from gemelo.providers.local import LocalProvider

        return LocalProvider()
    if value == "e2b":
        from gemelo.providers.e2b import E2BProvider

        return E2BProvider()

    raise UnknownProviderError(
        f"SANDBOX_PROVIDER={value!r} no es válido. Valores válidos: {', '.join(VALID_PROVIDERS)}"
    )


__all__ = [
    "DEFAULT_PROVIDER",
    "VALID_PROVIDERS",
    "ExecEvent",
    "ExecExit",
    "ExecOutput",
    "NetworkProfile",
    "ProviderError",
    "QuotaExceededError",
    "Sandbox",
    "SandboxProvider",
    "UnknownProviderError",
    "gateway_only",
    "get_provider",
    "isolated",
    "open_network",
]
