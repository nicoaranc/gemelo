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

// Tono semántico para la UI nueva (tokens leak, honey, safe, blocked). Separado de los
// mapas de arriba, que usa el panel viejo con sus clases propias.
export type Tone = "leak" | "honey" | "safe" | "blocked" | "muted";

export const VERDICT_KIND: Record<string, Tone> = {
  leaked: "leak",
  delivered: "safe",
  ok: "safe",
  blocked: "blocked",
  rejected_tests: "blocked",
  rejected_leak: "blocked",
  agent_error: "leak",
  timeout: "blocked",
  cancelled: "muted",
  failed: "leak",
};

export const STATUS_LABEL: Record<string, string> = {
  queued: "en cola",
  pending: "esperando",
  provisioning: "preparando caja",
  running: "corriendo",
  agent_running: "agente trabajando",
  agent_done: "agente terminó",
  testing: "corriendo tests",
  scanning: "escaneando diff",
  evaluating: "evaluando",
  done: "terminado",
  failed: "falló",
  agent_error: "error del agente",
  timeout: "timeout",
  cancelled: "cancelado",
};

export const TONE_CLASS: Record<Tone, string> = {
  leak: "bg-leak-soft text-leak border-leak/40",
  honey: "bg-honey-soft text-honey border-honey/40",
  safe: "bg-safe-soft text-safe border-safe/40",
  blocked: "bg-blocked-soft text-blocked border-blocked/40",
  muted: "bg-muted text-muted-foreground border-border",
};
