"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import "../panel/panel.css";

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/panel";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await fetch("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (r.ok) router.replace(next.startsWith("/") ? next : "/panel");
    else setError("Contraseña incorrecta");
  }

  return (
    <form className="login card" onSubmit={submit}>
      <h1>Gemelo</h1>
      <p className="muted">Panel de operación del equipo</p>
      <input
        type="password"
        autoFocus
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button disabled={busy || !password}>{busy ? "Entrando…" : "Entrar"}</button>
      {error && <p className="bad">{error}</p>}
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="gp gp-center">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
