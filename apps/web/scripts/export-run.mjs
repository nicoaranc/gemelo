#!/usr/bin/env node
// Exporta una corrida terminada a una grabación estática (public/replays/<id>.json)
// que la web reproduce sin API ni sesión.
//
// Uso:
//   node scripts/export-run.mjs <run_id> [--wait 2m] [--id nombre] [--title "..."] [--highlight "..."] [--out dir]
//
// Variables: GEMELO_API_URL (por defecto http://localhost:8000) y GEMELO_API_TOKEN (opcional,
// se manda como Bearer por si la API protege las lecturas).
//
// --wait espera antes de leer: las alertas de canary llegan minutos después del fin y
// recalculan los veredictos, así que el run final y los eventos se leen después de esperar.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FINISHED = new Set(["done", "failed", "cancelled"]);
const here = path.dirname(fileURLToPath(import.meta.url));

function usage(msg) {
  if (msg) console.error(`error: ${msg}`);
  console.error(
    "uso: node scripts/export-run.mjs <run_id> [--wait 2m] [--id nombre] [--title texto] [--highlight texto] [--out dir]",
  );
  process.exit(2);
}

function parseArgs(argv) {
  const opts = { wait: 0, out: path.join(here, "..", "public", "replays") };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) {
      rest.push(a);
      continue;
    }
    const v = argv[++i];
    if (v === undefined) usage(`falta el valor de ${a}`);
    if (a === "--wait") opts.wait = parseDuration(v);
    else if (a === "--id") opts.id = v;
    else if (a === "--title") opts.title = v;
    else if (a === "--highlight") opts.highlight = v;
    else if (a === "--out") opts.out = path.resolve(v);
    else usage(`opción desconocida ${a}`);
  }
  if (rest.length !== 1) usage("falta el run_id");
  opts.runId = rest[0];
  return opts;
}

// "90s", "2m", "1m30s" o segundos sueltos
function parseDuration(s) {
  if (/^\d+$/.test(s)) return Number(s) * 1000;
  const m = /^(?:(\d+)m)?(?:(\d+)s)?$/.exec(s);
  if (!m || (!m[1] && !m[2])) usage(`duración inválida: ${s}`);
  return (Number(m[1] || 0) * 60 + Number(m[2] || 0)) * 1000;
}

const base = (process.env.GEMELO_API_URL || "http://localhost:8000").replace(/\/$/, "");
const headers = process.env.GEMELO_API_TOKEN ? { authorization: `Bearer ${process.env.GEMELO_API_TOKEN}` } : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(p) {
  const r = await fetch(`${base}${p}`, { headers });
  return r;
}

async function getRun(id) {
  const r = await get(`/runs/${id}`);
  if (!r.ok) throw new Error(`GET /runs/${id} respondió ${r.status}: ${await r.text()}`);
  return r.json();
}

// Lee todo el historial del SSE de una vez; follow=false cierra el stream al final
async function getEvents(id) {
  const r = await get(`/runs/${id}/events?after=0&follow=false`);
  if (!r.ok) throw new Error(`GET /runs/${id}/events respondió ${r.status}`);
  const text = await r.text();
  const events = [];
  for (const block of text.split("\n\n")) {
    let type = "message";
    let data = "";
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) type = line.slice(6).trim();
      else if (line.startsWith("data:")) data += line.slice(5).trim();
    }
    if (!data || type === "end" || type === "message") continue;
    events.push(JSON.parse(data));
  }
  events.sort((a, b) => a.seq - b.seq);
  return events;
}

async function getDiff(id, lane) {
  const r = await get(`/runs/${id}/lanes/${lane}/diff`);
  const body = await r.text();
  if (r.ok) return { text: body };
  let detail = body;
  try {
    detail = JSON.parse(body).detail ?? body;
  } catch {}
  if (r.status === 409) return { error: `No entregado: ${detail}` };
  if (r.status === 404) return { error: "Sin diff" };
  return { error: `Error ${r.status}: ${detail}` };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const id = opts.runId;

  let run = await getRun(id);
  while (!FINISHED.has(run.status)) {
    console.error(`la corrida está en ${run.status}; espero a que termine…`);
    await sleep(5000);
    run = await getRun(id);
  }

  if (opts.wait) {
    console.error(`espero ${opts.wait / 1000} s por alertas de canary tardías…`);
    await sleep(opts.wait);
  }

  // Se leen después de esperar: una filtración tardía cambia eventos y veredictos
  run = await getRun(id);
  const events = await getEvents(id);
  const diffs = {};
  for (const lane of Object.keys(run.lanes)) diffs[lane] = await getDiff(id, lane);

  const outId = opts.id || id;
  const recording = {
    meta: {
      id: outId,
      title: opts.title || `Corrida ${id}`,
      task_id: run.task_id,
      attack: run.attack,
      highlight: opts.highlight || null,
      run_mode: run.mode,
      exported_at: new Date().toISOString(),
    },
    run,
    events,
    diffs,
  };

  await mkdir(opts.out, { recursive: true });
  const file = path.join(opts.out, `${outId}.json`);
  await writeFile(file, JSON.stringify(recording, null, 1) + "\n");

  const leaks = events.filter((e) => e.type === "leak.detected");
  const late = leaks.filter((e) => e.data?.late);
  console.log(
    `grabación escrita en ${path.relative(process.cwd(), file)}: ${events.length} eventos, ` +
      `${leaks.length} filtraciones (${late.length} tardías), ${Object.keys(diffs).length} diffs`,
  );
}

main().catch((e) => {
  console.error(`error: ${e.message}`);
  process.exit(1);
});
