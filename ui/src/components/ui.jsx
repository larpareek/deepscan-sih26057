// DeepScan: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057)
import * as Tooltip from "@radix-ui/react-tooltip";
import { useState } from "react";
import { explain } from "../lib/glossary";

const TOOLTIP_CLASS =
  "z-[1200] max-w-[min(18rem,85vw)] rounded border border-line-strong bg-surface-3 px-3 py-2 text-xs leading-relaxed text-ink-2 shadow-lg shadow-black/40 " +
  "data-[state=delayed-open]:animate-pop-in data-[state=instant-open]:animate-pop-in data-[state=closed]:animate-pop-out";

export const TooltipProvider = ({ children }) => (
  <Tooltip.Provider delayDuration={300} skipDelayDuration={150}>
    {children}
  </Tooltip.Provider>
);

/** Hover/focus tooltip. The single child must be focusable. */
export function Tip({ content, children, side = "bottom", align = "center" }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side={side} align={align} sideOffset={6} collisionPadding={12} className={TOOLTIP_CLASS}>
          {content}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/**
 * A technical term with a plain-language definition (dotted underline).
 * Opens on hover, keyboard focus or tap.
 */
export function Term({ term, children, className = "" }) {
  const [open, setOpen] = useState(false);
  const text = explain(term);
  if (!text) return children ?? term;
  return (
    <Tooltip.Root open={open} onOpenChange={setOpen}>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault(); // keep Radix from closing it, so a tap opens it
            setOpen(true);
          }}
          className={`term -my-1 inline-block rounded-sm py-1 text-left [text-transform:inherit] ${className}`}
        >
          {children ?? term}
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side="bottom" align="start" sideOffset={4} collisionPadding={12} className={TOOLTIP_CLASS}>
          <span className="mb-0.5 block font-medium capitalize text-ink">{term}</span>
          {text}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/** Status tag: text + colour, e.g. [● CRITICAL]. */
export function StatusTag({ status, className = "" }) {
  return (
    <span className={`tag ${status.text} ${className}`}>
      <span className="h-1.5 w-1.5 shrink-0" style={{ background: status.color }} aria-hidden="true" />
      {status.label}
    </span>
  );
}

/** Label / value row for readouts. */
export function Field({ label, children, mono = true, className = "" }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 py-[3px] ${className}`}>
      <dt className="label shrink-0">{label}</dt>
      <dd className={`min-w-0 truncate text-right text-[13px] ${mono ? "readout" : "text-ink"}`}>{children}</dd>
    </div>
  );
}
