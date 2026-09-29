// DeepScan: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057)
import { ArrowDown, ArrowUp } from "lucide-react";
import { useMemo, useState } from "react";
import { StatusTag, Term } from "./ui";

const COLUMNS = [
  { key: "id", label: "ID", sort: (d) => d.id },
  { key: "type", label: "Type", sort: (d) => d.label },
  { key: "range", label: "Range", unit: "m", num: true, sort: (d) => Math.abs(d.rangeM) },
  { key: "along", label: "Along-track", unit: "m", num: true, sort: (d) => d.alongM },
  { key: "size", label: "Size L×W", unit: "m", num: true, sort: (d) => d.dims.length },
  { key: "conf", label: "Conf.", unit: "%", num: true, sort: (d) => d.confidence },
  { key: "status", label: "Status", sort: (d) => d.status.rank },
];

export default function DetectionsTable({ detections, hiddenCount, activeId, selectedId, onHover, onSelect, hasScan, busy }) {
  const [sort, setSort] = useState({ key: "status", dir: -1 });
  const rows = useMemo(() => {
    const col = COLUMNS.find((c) => c.key === sort.key);
    return [...detections].sort((a, b) => {
      const va = col.sort(a), vb = col.sort(b);
      const cmp = typeof va === "string" ? va.localeCompare(vb) : va - vb;
      return cmp * sort.dir || b.confidence - a.confidence; // tie-break: highest confidence first
    });
  }, [detections, sort]);

  const toggleSort = (key) => setSort((s) => (s.key === key ? { key, dir: -s.dir } : { key, dir: key === "id" || key === "type" ? 1 : -1 }));

  return (
    <section className="pane h-full" aria-labelledby="det-h">
      <div className="pane-head">
        <h2 id="det-h" className="pane-title">Detections</h2>
        <span className="font-mono text-2xs text-ink-3">
          <span className="text-ink-2">{detections.length}</span> shown
          {hiddenCount > 0 && <> · {hiddenCount} filtered</>}
        </span>
      </div>

      {detections.length === 0 ? (
        <p className="px-3 py-4 text-[13px] text-ink-3">
          {busy
            ? "Processing scan…"
            : !hasScan
              ? "No scan loaded."
              : hiddenCount > 0
                ? <>No detections match the current <Term term="confidence threshold">threshold</Term> and filters.</>
                : "No objects detected in this scan."}
        </p>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="data-table" aria-label="Detected objects">
            <thead>
              <tr>
                {COLUMNS.map((c) => (
                  <th key={c.key} scope="col" className={c.num ? "text-right" : ""} aria-sort={sort.key === c.key ? (sort.dir > 0 ? "ascending" : "descending") : "none"}>
                    <button type="button" onClick={() => toggleSort(c.key)} className={`hit inline-flex items-center gap-1 uppercase hover:text-ink-2 ${c.num ? "flex-row-reverse" : ""}`}>
                      <span>
                        {c.label}
                        {/* Units keep their case ("m", not "M") inside the uppercase header */}
                        {c.unit && <span className="normal-case tracking-normal"> ({c.unit})</span>}
                      </span>
                      {sort.key === c.key && (sort.dir > 0 ? <ArrowUp size={11} aria-hidden="true" /> : <ArrowDown size={11} aria-hidden="true" />)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => {
                const selected = d.id === selectedId;
                return (
                  <tr
                    key={d.id}
                    aria-selected={selected}
                    className={d.id === activeId && !selected ? "bg-surface-2" : ""}
                    onMouseEnter={() => onHover(d.id)}
                    onMouseLeave={() => onHover(null)}
                    onClick={() => onSelect(d.id)}
                  >
                    <td>
                      {/* The ID cell carries the keyboard control for the whole row */}
                      <button
                        type="button"
                        className="hit -mx-1 px-1 text-left font-mono text-ink hover:text-accent"
                        aria-label={`${selected ? "Deselect" : "Select"} ${d.id}, ${d.label}`}
                        onFocus={() => onHover(d.id)}
                        onBlur={() => onHover(null)}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(d.id);
                        }}
                      >
                        {d.id}
                      </button>
                    </td>
                    <td className="text-ink">{d.label}</td>
                    <td className="num text-ink-2">
                      {Math.abs(d.rangeM).toFixed(1)} <span className="inline-block w-3 text-left text-ink-3">{d.rangeM >= 0 ? "S" : "P"}</span>
                    </td>
                    <td className="num text-ink-2">{d.alongM.toFixed(1)}</td>
                    <td className="num text-ink-2">
                      {d.dims.length.toFixed(1)}×{d.dims.width.toFixed(1)}
                    </td>
                    <td className="num text-ink">{d.confidence.toFixed(1)}</td>
                    <td>
                      <StatusTag status={d.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
