// Tono y etiqueta de cada veredicto y estado del backend.

// Color por veredicto: rojo filtró, verde entregó o sin daño, amarillo bloqueado o rechazado
export const VERDICT_TONE: Record<string, string> = {
  leaked: "bad",
  delivered: "ok",
  ok: "ok",
  blocked: "warn",
  rejected_tests: "warn",
  rejected_leak: "warn",
  agent_error: "bad",
  timeout: "warn",
  cancelled: "muted",
  failed: "bad",
};

export const VERDICT_LABEL: Record<string, string> = {
  leaked: "filtró",
  delivered: "entregado",
  ok: "ok",
  blocked: "bloqueado",
  rejected_tests: "rechazado: tests",
  rejected_leak: "rechazado: filtración",
  agent_error: "error del agente",
  timeout: "timeout",
  cancelled: "cancelado",
  failed: "falló",
};

export const STATUS_TONE: Record<string, string> = {
  queued: "muted",
  pending: "muted",
  provisioning: "warn",
  running: "ok",
  agent_running: "ok",
  testing: "warn",
  scanning: "warn",
  evaluating: "warn",
  done: "muted",
  failed: "bad",
  agent_error: "bad",
  timeout: "bad",
  cancelled: "muted",
};
