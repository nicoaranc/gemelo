"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, duration, fmtDate, post } from "@/lib/api";
import { LANE_LABEL, LANE_ORDER, type Run, type Task, type Vector } from "@/lib/types";
import { usePoll } from "./_ui/usePoll";
import { Status, Verdict } from "./_ui/Verdict";
import { PRESETS, VECTOR_LABEL } from "./_ui/presets";

function NewRun({ onCreated }: { onCreated: () => void }) {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskId, setTaskId] = useState("");
  const [vector, setVector] = useState<Vector>("readme");
  const [payload, setPayload] = useState(PRESETS[0].payload);
  const [author, setAuthor] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Task[]>("/tasks")
      .then((t) => {
        setTasks(t);
        if (t[0]) setTaskId(t[0].id);
      })
      .catch((e) => setError(e.message));
    try {
      setAuthor(localStorage.getItem("gemelo.author") || "");
    } catch {}
  }, []);

  const task = tasks.find((t) => t.id === taskId);
  const vectors: Vector[] = task?.vectors ?? ["readme", "issue", "webpage"];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      try {
        localStorage.setItem("gemelo.author", author);
      } catch {}
      const body = {
        task_id: taskId,
        attack: payload.trim() ? { vector, payload, author: author || null } : null,
      };
      const r = await post<{ run_id: string }>("/runs", body);
      onCreated();
      router.push(`/panel/runs/${r.run_id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <form className="card stack" onSubmit={submit}>
      <h2>Corrida nueva</h2>
      <div>
        <label>Tarea</label>
        <select value={taskId} onChange={(e) => setTaskId(e.target.value)}>
          {tasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title} ({t.id})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label>Vector de ataque</label>
        <select value={vector} onChange={(e) => setVector(e.target.value as Vector)}>
          {vectors.map((v) => (
            <option key={v} value={v}>
              {VECTOR_LABEL[v] ?? v}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label>Plantilla</label>
        <div className="row">
          {PRESETS.map((p) => (
            <button type="button" key={p.name} className="ghost" onClick={() => setPayload(p.payload)}>
              {p.name}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label>
          Payload ({payload.length}/8192){!payload.trim() && " · sin ataque, corrida de control"}
        </label>
        <textarea value={payload} maxLength={8192} onChange={(e) => setPayload(e.target.value)} />
      </div>
      <div>
        <label>Autor (opcional)</label>
        <input value={author} maxLength={64} onChange={(e) => setAuthor(e.target.value)} placeholder="alias" />
      </div>
      <button disabled={busy || !taskId}>{busy ? "Lanzando…" : "Lanzar en los 4 carriles"}</button>
      {error && <p className="bad">{error}</p>}
    </form>
  );
}

function History({ runs }: { runs: Run[] | null }) {
  const router = useRouter();
  if (!runs) return <p className="muted">Cargando…</p>;
  if (!runs.length) return <p className="muted">Todavía no hay corridas.</p>;
  return (
    <table>
      <thead>
        <tr>
          <th>Corrida</th>
          <th>Tarea</th>
          <th>Vector</th>
          <th>Estado</th>
          {LANE_ORDER.map((l) => (
            <th key={l}>{LANE_LABEL[l]}</th>
          ))}
          <th>Duración</th>
        </tr>
      </thead>
      <tbody>
        {runs.map((r) => (
          <tr key={r.id} className="click" onClick={() => router.push(`/panel/runs/${r.id}`)}>
            <td>
              <Link href={`/panel/runs/${r.id}`} className="mono">
                {r.id}
              </Link>
              <div className="muted" style={{ fontSize: 12 }}>
                {fmtDate(r.created_at)}
                {r.attack?.author ? ` · ${r.attack.author}` : ""}
              </div>
            </td>
            <td>{r.task_id}</td>
            <td>{r.attack?.vector ?? <span className="muted">control</span>}</td>
            <td>
              <Status s={r.status} />
              {r.queue_position ? <span className="muted"> #{r.queue_position}</span> : null}
            </td>
            {LANE_ORDER.map((l) => (
              <td key={l}>
                {r.lanes[l] ? <Verdict v={r.lanes[l].result?.verdict} /> : <span className="muted">-</span>}
              </td>
            ))}
            <td className="muted">{duration(r.created_at, r.ended_at)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function PanelHome() {
  const runs = usePoll(() => api<Run[]>("/runs?limit=50"), 3000);
  const queue = usePoll(() => api<{ run_id: string; position: number; task_id: string }[]>("/queue"), 3000);

  return (
    <div className="grid2">
      <div className="stack">
        <NewRun onCreated={runs.refresh} />
        <div className="card">
          <h2>Cola</h2>
          {queue.data?.length ? (
            <ol style={{ margin: 0, paddingLeft: 18 }}>
              {queue.data.map((q) => (
                <li key={q.run_id}>
                  <Link href={`/panel/runs/${q.run_id}`} className="mono">
                    {q.run_id}
                  </Link>{" "}
                  <span className="muted">{q.task_id}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              Vacía
            </p>
          )}
        </div>
      </div>
      <div className="card" style={{ overflowX: "auto" }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2>Historial</h2>
          {runs.error && <span className="bad">{runs.error}</span>}
        </div>
        <History runs={runs.data} />
      </div>
    </div>
  );
}
