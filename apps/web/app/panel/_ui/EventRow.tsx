import { fmtTime } from "@/lib/api";
import { describe } from "@/lib/events";
import type { GEvent } from "@/lib/types";

export { describe };

export function EventRow({ ev, showWhere = false }: { ev: GEvent; showWhere?: boolean }) {
  const { cls, text, detail } = describe(ev);
  const where = showWhere && ev.lane ? `${ev.lane}${ev.role && ev.role !== "unico" ? "/" + ev.role : ""} ` : "";
  const head = (
    <>
      <span className="t">
        {fmtTime(ev.ts)}
        {ev.step ? ` #${ev.step}` : ""}
      </span>
      {where && <span className="mono muted">{where}</span>}
      {text}
    </>
  );
  return (
    <div className={`ev ${cls}`}>
      {detail ? (
        <details>
          <summary>{head}</summary>
          <pre>{detail}</pre>
        </details>
      ) : (
        head
      )}
    </div>
  );
}
