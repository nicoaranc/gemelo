"use client";

import { useEffect, useRef, useState } from "react";
import type { GEvent } from "@/lib/types";

export type StreamState = "connecting" | "live" | "ended" | "retrying";

// Lee el SSE con fetch en vez de EventSource: los eventos vienen con nombre (event: tool.pre)
// y así no hay que registrar cada tipo. Reconecta con ?after=<último seq> sin huecos ni duplicados.
export function useRunStream(runId: string, onEvent?: (ev: GEvent) => void) {
  const [events, setEvents] = useState<GEvent[]>([]);
  const [state, setState] = useState<StreamState>("connecting");
  const cb = useRef(onEvent);
  cb.current = onEvent;

  useEffect(() => {
    let last = 0;
    let stopped = false;
    let ctrl = new AbortController();
    const buf: GEvent[] = [];
    let flushT: ReturnType<typeof setTimeout> | null = null;

    // Junta eventos para no re-renderizar por cada uno cuando llega el historial
    const flush = () => {
      flushT = null;
      if (!buf.length) return;
      const batch = buf.splice(0);
      setEvents((prev) => [...prev, ...batch]);
    };

    async function connect() {
      while (!stopped) {
        ctrl = new AbortController();
        try {
          const r = await fetch(`/api/gemelo/runs/${runId}/events?after=${last}`, {
            signal: ctrl.signal,
            cache: "no-store",
          });
          if (r.status === 401) {
            window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
            return;
          }
          if (!r.ok || !r.body) throw new Error(`HTTP ${r.status}`);
          setState("live");
          const reader = r.body.pipeThrough(new TextDecoderStream()).getReader();
          let text = "";
          let ended = false;
          while (!ended) {
            const { value, done } = await reader.read();
            if (done) break;
            text += value;
            let idx: number;
            while ((idx = text.indexOf("\n\n")) >= 0) {
              const block = text.slice(0, idx);
              text = text.slice(idx + 2);
              let type = "message";
              let data = "";
              for (const line of block.split("\n")) {
                if (line.startsWith("event:")) type = line.slice(6).trim();
                else if (line.startsWith("data:")) data += line.slice(5).trim();
              }
              if (type === "end") {
                ended = true;
                break;
              }
              if (!data || type === "message") continue;
              const ev = JSON.parse(data) as GEvent;
              if (ev.seq <= last) continue;
              last = ev.seq;
              buf.push(ev);
              cb.current?.(ev);
              if (!flushT) flushT = setTimeout(flush, 80);
            }
          }
          if (ended) {
            setState("ended");
            return;
          }
        } catch (e) {
          if (stopped) return;
        }
        setState("retrying");
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    connect();
    return () => {
      stopped = true;
      ctrl.abort();
      if (flushT) clearTimeout(flushT);
    };
  }, [runId]);

  return { events, state };
}
