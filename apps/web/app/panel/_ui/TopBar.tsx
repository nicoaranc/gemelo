"use client";

import Link from "next/link";
import { api } from "@/lib/api";
import type { Health } from "@/lib/types";
import { usePoll } from "./usePoll";

export function TopBar() {
  const { data: h, error } = usePoll(() => api<Health>("/health"), 10000);

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <header className="top">
      <Link href="/panel" className="brand">
        Gemelo · panel
      </Link>
      {error ? (
        <span className="bad">orquestador caído: {error}</span>
      ) : h ? (
        <span className="row muted" style={{ fontSize: 12 }}>
          <span className={`dot ${h.ok ? "live" : ""}`} /> API
          <span className={`dot ${h.gateway_ok ? "live" : ""}`} /> gateway
          <span>provider {h.provider}</span>
          <span>agente {h.agent}</span>
          <span>carriles {h.lanes.join(", ")}</span>
        </span>
      ) : (
        <span className="muted">conectando…</span>
      )}
      <span className="spacer" />
      <button className="ghost" onClick={logout}>
        Salir
      </button>
    </header>
  );
}
