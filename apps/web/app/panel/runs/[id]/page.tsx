"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, api, duration, fmtDate, fmtTime, post } from "@/lib/api";
import { FINISHED, LANE_LABEL, LANE_ORDER, ROLE_LABEL, type GEvent, type Run } from "@/lib/types";
import { EventRow, describe } from "../../_ui/EventRow";
import { useRunStream } from "@/hooks/useRunStream";
import { Bool, Status, Verdict } from "../../_ui/Verdict";

// Tipos que cambian el estado de la corrida: tras ellos se relee GET /runs/{id}
const REFRESH_ON = new Set(["run.status", "lane.status", "sandbox.ready", "agent.end", "lane.result", "run.result", "run.end", "net.cut", "leak.detected"]);

function BoxCard({ run, lane, role, events }: { run: Run; lane: string; role: string; events: GEvent[] }) {
  const box = run.lanes[lane]?.boxes[role];
  const feed = useRef<HTMLDivElement>(null);
  const [follow, setFollow] = useState(true);
  const leaked = events.some((e) => e.type === "leak.detected" && e.data.pool === "B");
  const visible = events.filter((e) => e.type !== "tool.post" && e.type !== "lane.status");

  useEffect(() => {
    if (follow && feed.current) feed.current.scrollTop = feed.current.scrollHeight;
  }, [visible.length, follow]);

  return (
    <div className={`box ${leaked ? "leaked" : ""}`}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <strong>{ROLE_LABEL[role] ?? role}</strong>
        {box && <Status s={box.status} />}
      </div>
      {box && (
        <div className="meta">
          <span>red {box.network}</span>
          <span>paso {box.step}</span>
          <span>{box.turns} turnos</span>
          <span>US$ {box.agent_cost_usd.toFixed(3)}</span>
          {box.tainted && <span className="warn">contaminada</span>}
          {leaked && <span className="bad">filtró</span>}
        </div>
      )}
      <div
        className="feed"
        ref={feed}
        onScroll={(e) => {
          const el = e.currentTarget;
          setFollow(el.scrollHeight - el.scrollTop - el.clientHeight < 30);
        }}
      >
        {visible.length ? visible.map((ev) => <EventRow key={ev.seq} ev={ev} />) : <span className="muted">sin eventos</span>}
      </div>
    </div>
  );
}

function LaneColumn({ run, lane, events }: { run: Run; lane: string; events: GEvent[] }) {
  const l = run.lanes[lane];
  const roles = lane === "gemelo" ? ["bajo", "alto"] : ["unico"];
  return (
    <div className="lane card">
      <div className="head">
        <h3 style={{ margin: 0 }}>{LANE_LABEL[lane] ?? lane}</h3>
        <span className="row">
          <Status s={l.status} />
          <Verdict v={l.result?.verdict} />
        </span>
      </div>
      {roles.map((role) => (
        <BoxCard key={role} run={run} lane={lane} role={role} events={events.filter((e) => e.role === role)} />
      ))}
    </div>
  );
}

function ResultsTable({ run }: { run: Run }) {
  const lanes = LANE_ORDER.filter((l) => run.lanes[l]);
  const rows: [string, (l: string) => React.ReactNode][] = [
    ["Veredicto", (l) => <Verdict v={run.lanes[l].result?.verdict} />],
    ["Filtró secreto (pool B)", (l) => <Bool v={run.lanes[l].result?.leaked ?? null} bad />],
    ["Filtró honeytoken (pool A)", (l) => <Bool v={run.lanes[l].result?.honeytoken_leaked ?? null} bad />],
    ["Tests de la tarea", (l) => <Bool v={run.lanes[l].result?.task_passed ?? null} yes="pasan" no="fallan" />],
    // La entrega condicionada solo existe en el gemelo; los otros carriles siempre entregan
    ["Diff entregado", (l) => (l === "gemelo" ? <Bool v={run.lanes[l].result?.delivered ?? null} /> : <span className="muted">siempre</span>)],
    ["Herramientas negadas", (l) => run.lanes[l].result?.denied_tools ?? "…"],
    ["Salidas bloqueadas", (l) => run.lanes[l].result?.blocked_egress ?? "…"],
    ["Red cortada", (l) => <Bool v={run.lanes[l].result?.network_cut ?? null} neutral />],
    ["Turnos", (l) => run.lanes[l].result?.turns ?? "…"],
    ["Costo", (l) => (run.lanes[l].result ? `US$ ${run.lanes[l].result!.cost_usd.toFixed(3)}` : "…")],
    ["Latencia", (l) => (run.lanes[l].result ? `${run.lanes[l].result!.latency_s.toFixed(1)} s` : "…")],
    ["Detalle", (l) => <span className="muted">{run.lanes[l].result?.detail ?? ""}</span>],
  ];
  return (
    <table>
      <thead>
        <tr>
          <th />
          {lanes.map((l) => (
            <th key={l}>{LANE_LABEL[l]}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(([name, f]) => (
          <tr key={name}>
            <td className="muted">{name}</td>
            {lanes.map((l) => (
              <td key={l}>{f(l)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Leaks({ events }: { events: GEvent[] }) {
  const leaks = events.filter((e) => e.type === "leak.detected");
  if (!leaks.length) return <p className="muted">Sin filtraciones detectadas.</p>;
  return (
    <table>
      <thead>
        <tr>
          <th>Hora</th>
          <th>Carril</th>
          <th>Caja</th>
          <th>Paso</th>
          <th>Qué</th>
          <th>Variable</th>
          <th>Fuente</th>
          <th>Canal</th>
          <th>Encoding</th>
        </tr>
      </thead>
      <tbody>
        {leaks.map((e) => (
          <tr key={e.seq}>
            <td className="mono">{fmtTime(e.ts)}</td>
            <td>{LANE_LABEL[e.lane ?? ""] ?? e.lane}</td>
            <td>{e.role}</td>
            <td>{e.step ?? "?"}</td>
            <td>
              <span className={`pill ${e.data.pool === "B" ? "bad" : "warn"}`}>
                {e.data.pool === "B" ? "secreto real" : "honeytoken"}
              </span>
              {e.data.late && <span className="muted"> tardía</span>}
            </td>
            <td className="mono">{e.data.env_name}</td>
            <td>{e.data.source}</td>
            <td>{e.data.channel ?? ""}</td>
            <td>{e.data.encoding}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DiffView({ run }: { run: Run }) {
  const lanes = LANE_ORDER.filter((l) => run.lanes[l]);
  const [lane, setLane] = useState(lanes.includes("gemelo") ? "gemelo" : lanes[0]);
  const [diff, setDiff] = useState<{ text?: string; error?: string } | null>(null);
  const done = FINISHED.includes(run.status) || run.lanes[lane]?.result;

  useEffect(() => {
    if (!done) return;
    setDiff(null);
    api<string>(`/runs/${run.id}/lanes/${lane}/diff`)
      .then((text) => setDiff({ text }))
      .catch((e: ApiError) => setDiff({ error: e.status === 409 ? `No entregado: ${e.message}` : e.message }));
  }, [run.id, lane, done]);

  return (
    <div>
      <div className="row" style={{ marginBottom: 8 }}>
        {lanes.map((l) => (
          <button key={l} className={l === lane ? "" : "ghost"} onClick={() => setLane(l)}>
            {LANE_LABEL[l]}
          </button>
        ))}
        {lane === "gemelo" && <span className="muted">diff del alto, solo si se entregó</span>}
      </div>
      {!done ? (
        <p className="muted">El diff aparece cuando el carril termina.</p>
      ) : !diff ? (
        <p className="muted">Cargando…</p>
      ) : diff.error ? (
        <p className="warn">{diff.error}</p>
      ) : (
        <pre className="diff">
          {diff.text!.split("\n").map((line, i) => (
            <div
              key={i}
              className={
                line.startsWith("+") && !line.startsWith("+++")
                  ? "add"
                  : line.startsWith("-") && !line.startsWith("---")
                    ? "del"
                    : line.startsWith("@@")
                      ? "hunk"
                      : ""
              }
            >
              {line || " "}
            </div>
          ))}
        </pre>
      )}
    </div>
  );
}

function RawLog({ events }: { events: GEvent[] }) {
  const [q, setQ] = useState("");
  const [lane, setLane] = useState("");
  const shown = useMemo(() => {
    const needle = q.toLowerCase();
    return events.filter(
      (e) =>
        (!lane || e.lane === lane) &&
        (!needle || e.type.includes(needle) || describe(e).text.toLowerCase().includes(needle)),
    );
  }, [events, q, lane]);
  return (
    <div>
      <div className="row" style={{ marginBottom: 8 }}>
        <input style={{ maxWidth: 320 }} placeholder="filtrar por tipo o texto" value={q} onChange={(e) => setQ(e.target.value)} />
        <select style={{ maxWidth: 200 }} value={lane} onChange={(e) => setLane(e.target.value)}>
          <option value="">todos los carriles</option>
          {LANE_ORDER.map((l) => (
            <option key={l} value={l}>
              {LANE_LABEL[l]}
            </option>
          ))}
        </select>
        <span className="muted">
          {shown.length} de {events.length} eventos
        </span>
      </div>
      <div className="feed" style={{ maxHeight: 600 }}>
        {shown.map((e) => (
          <EventRow key={e.seq} ev={e} showWhere />
        ))}
      </div>
    </div>
  );
}

const TABS = ["Resultados", "Filtraciones", "Diff", "Log"] as const;

export default function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [run, setRun] = useState<Run | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Resultados");
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      setRun(await api<Run>(`/runs/${id}`));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  // Relee el estado como mucho cada 700 ms mientras llegan eventos
  const onEvent = useCallback(
    (ev: GEvent) => {
      if (!REFRESH_ON.has(ev.type) || pending.current) return;
      pending.current = setTimeout(() => {
        pending.current = null;
        load();
      }, 700);
    },
    [load],
  );

  const { events, state } = useRunStream(id, onEvent);

  useEffect(() => {
    load();
  }, [load]);

  const byLane = useMemo(() => {
    const m: Record<string, GEvent[]> = {};
    for (const e of events) if (e.lane) (m[e.lane] ||= []).push(e);
    return m;
  }, [events]);

  const leaks = events.filter((e) => e.type === "leak.detected").length;
  const runErrors = events.filter((e) => e.type === "error" && !e.lane);

  if (error && !run) {
    return (
      <div className="card">
        <p className="bad">{error}</p>
        <Link href="/panel">Volver</Link>
      </div>
    );
  }
  if (!run) return <p className="muted">Cargando…</p>;

  const finished = FINISHED.includes(run.status);

  return (
    <div className="stack">
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <h1 className="mono" style={{ fontSize: 16 }}>
              {run.id}
            </h1>
            <div className="row muted" style={{ fontSize: 12 }}>
              <span>tarea {run.task_id}</span>
              <span>vector {run.attack?.vector ?? "sin ataque"}</span>
              {run.attack?.author && <span>autor {run.attack.author}</span>}
              <span>modo {run.mode}</span>
              <span>{fmtDate(run.created_at)}</span>
              <span>{duration(run.created_at, run.ended_at)}</span>
            </div>
          </div>
          <div className="row">
            <span className={`dot ${state === "live" ? "live" : ""}`} title={`stream: ${state}`} />
            <span className="muted" style={{ fontSize: 12 }}>
              {state === "live" ? "en vivo" : state === "ended" ? "stream cerrado" : state === "retrying" ? "reconectando" : "conectando"}
            </span>
            <Status s={run.status} />
            {run.queue_position ? <span className="muted">en cola #{run.queue_position}</span> : null}
            {leaks > 0 && <span className="pill bad">{leaks} filtración(es)</span>}
            {!finished && (
              <button className="danger" onClick={() => post(`/runs/${run.id}/cancel`).then(load)}>
                Cancelar
              </button>
            )}
          </div>
        </div>
        {run.attack?.payload && (
          <details style={{ marginTop: 8 }}>
            <summary className="muted" style={{ cursor: "pointer" }}>
              Payload del ataque
            </summary>
            <pre className="diff" style={{ marginTop: 6 }}>
              {run.attack.payload}
            </pre>
          </details>
        )}
        {run.error && <p className="banner" style={{ marginTop: 8 }}>{run.error}</p>}
        {runErrors.map((e) => (
          <p key={e.seq} className="banner" style={{ marginTop: 8 }}>
            {describe(e).text}
          </p>
        ))}
      </div>

      <div className="lanes">
        {LANE_ORDER.filter((l) => run.lanes[l]).map((l) => (
          <LaneColumn key={l} run={run} lane={l} events={byLane[l] ?? []} />
        ))}
      </div>

      <div className="card">
        <div className="tabs">
          {TABS.map((t) => (
            <button key={t} className={t === tab ? "on" : ""} onClick={() => setTab(t)}>
              {t}
              {t === "Filtraciones" && leaks ? ` (${leaks})` : ""}
              {t === "Log" ? ` (${events.length})` : ""}
            </button>
          ))}
        </div>
        {tab === "Resultados" && <ResultsTable run={run} />}
        {tab === "Filtraciones" && <Leaks events={events} />}
        {tab === "Diff" && <DiffView run={run} />}
        {tab === "Log" && <RawLog events={events} />}
      </div>
    </div>
  );
}
