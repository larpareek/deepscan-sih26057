import { useId, useRef, useState } from "react";
import { despeckleMethod } from "../lib/api";
import { Icon, MagneticButton, Term } from "./ui";

function DropZone({ files, onFiles }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);
  const hintId = useId();

  const accept = (list) => {
    const next = { ...files };
    for (const f of list) {
      const name = f.name.toLowerCase();
      if (name.endsWith(".json")) next.metadata = f;
      else if (/\.(png|jpe?g)$/.test(name)) next.image = f;
    }
    onFiles(next);
  };

  const chosen = [files.image, files.metadata].filter(Boolean);
  return (
    <div>
      <button
        type="button"
        aria-label="Upload sonar image and metadata"
        aria-describedby={hintId}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          accept(e.dataTransfer.files);
        }}
        className={`relative flex w-full flex-col items-center gap-3 overflow-hidden rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all duration-300 ease-in-out ${
          drag ? "border-neon bg-neon/10 shadow-neon" : "border-slate-400/60 hover:border-neon hover:bg-white/[0.04]"
        }`}
      >
        <span className="sonar-ping" aria-hidden="true" />
        <Icon name="upload" className="relative h-8 w-8 text-neon" />
        <span className="relative font-display text-xl font-bold tracking-tighter text-white" aria-hidden="true">{drag ? "Release to load" : "Drop scan here"}</span>
        <span className="muted relative" aria-hidden="true">or press to browse</span>
      </button>
      <p id={hintId} className="muted mt-3">
        A PNG or JPG image plus its <Term term="ping header">ping header</Term> metadata (JSON).
      </p>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".png,.jpg,.jpeg,.json"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => accept(e.target.files)}
      />

      <div aria-live="polite">
        {chosen.length > 0 && (
          <ul className="mt-4 space-y-2" aria-label="Selected files">
            {chosen.map((f) => (
              <li key={f.name} className="flex items-center gap-3 truncate text-base text-slate-200" title={f.name}>
                <Icon name="check" className="h-5 w-5 shrink-0 text-hazard-green" />
                <span className="truncate">{f.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Slider({ label, term, value, onChange, valueText }) {
  const id = useId();
  return (
    <div>
      <div className="mb-1 flex min-h-[44px] items-center justify-between">
        {/* The visible label is a glossary term; the input is named via aria-label */}
        <span className="text-lg text-slate-100">
          <Term term={term}>{label}</Term>
        </span>
        <output htmlFor={id} className="font-mono text-lg text-neon">
          {value}%
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        value={value}
        aria-label={label}
        aria-valuetext={valueText ?? `${value} percent`}
        onChange={(e) => onChange(Number(e.target.value))}
        className="neon-range"
        style={{ "--pct": `${value}%` }}
      />
    </div>
  );
}

export default function ControlsPanel({ files, onFiles, threshold, onThreshold, strength, onStrength, onRun, busy, canRun, error, onClose }) {
  const reasonId = useId();
  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex items-center justify-between">
        <h2 className="heading">Scan</h2>
        <MagneticButton type="button" className="btn-quiet lg:hidden" onClick={onClose} aria-label="Close scan controls">
          <Icon name="close" />
        </MagneticButton>
      </div>

      <DropZone files={files} onFiles={onFiles} />

      <div className="space-y-4">
        <Slider label="Confidence threshold" term="confidence threshold" value={threshold} onChange={onThreshold} />
        <Slider
          label="Speckle filter"
          term="speckle"
          value={strength}
          onChange={onStrength}
          valueText={`${strength} percent, ${despeckleMethod(strength)} filter`}
        />
      </div>

      <div className="mt-auto space-y-3">
        <MagneticButton
          type="button"
          className="btn-primary btn-shimmer w-full py-3"
          onClick={onRun}
          disabled={!canRun || busy}
          aria-describedby={canRun ? undefined : reasonId}
          aria-busy={busy}
        >
          {busy ? (
            <>
              <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-abyss border-t-transparent" />
              Analysing…
            </>
          ) : (
            "Run detection"
          )}
        </MagneticButton>
        {!canRun && (
          <p id={reasonId} className="muted">
            Needs an image, a metadata file and a running backend.
          </p>
        )}
        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-hazard/10 px-4 py-3 text-base text-hazard">
            <Icon name="alert" className="mt-0.5 h-5 w-5 shrink-0" />
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
