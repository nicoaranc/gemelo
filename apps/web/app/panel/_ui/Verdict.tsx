
// Color por veredicto: rojo filtró, verde entregó o sin daño, amarillo bloqueado o rechazado
const TONE: Record<string, string> = {
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

const LABEL: Record<string, string> = {
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

export function Verdict({ v }: { v: string | null | undefined }) {
  if (!v) return <span className="muted">…</span>;
  return <span className={`pill ${TONE[v] ?? "muted"}`}>{LABEL[v] ?? v}</span>;
}

const STATUS_TONE: Record<string, string> = {
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

export function Status({ s }: { s: string }) {
  return <span className={`pill ${STATUS_TONE[s] ?? "muted"}`}>{s.replace("_", " ")}</span>;
}

// bad: true es malo (filtró). neutral: sin color (red cortada, depende del carril).
export function Bool({
  v,
  yes = "sí",
  no = "no",
  bad = false,
  neutral = false,
}: {
  v: boolean | null;
  yes?: string;
  no?: string;
  bad?: boolean;
  neutral?: boolean;
}) {
  if (v === null || v === undefined) return <span className="muted">n/a</span>;
  const cls = neutral ? "" : v ? (bad ? "bad" : "ok") : bad ? "ok" : "bad";
  return <span className={cls}>{v ? yes : no}</span>;
}

