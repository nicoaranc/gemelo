import { STATUS_TONE, VERDICT_LABEL, VERDICT_TONE } from "@/lib/verdict";

export function Verdict({ v }: { v: string | null | undefined }) {
  if (!v) return <span className="muted">…</span>;
  return <span className={`pill ${VERDICT_TONE[v] ?? "muted"}`}>{VERDICT_LABEL[v] ?? v}</span>;
}

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

