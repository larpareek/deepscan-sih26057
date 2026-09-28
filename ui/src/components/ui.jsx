// DeepScan: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057)
import * as Tooltip from "@radix-ui/react-tooltip";
import { animate, motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { forwardRef, useEffect, useRef, useState } from "react";
import { explain } from "../lib/glossary";

const TOOLTIP_CLASS =
  "z-[1200] max-w-[min(20rem,85vw)] rounded-xl bg-abyss-900 px-4 py-3 text-sm font-normal leading-relaxed tracking-wide text-slate-200 shadow-2xl shadow-black/70 ring-1 ring-white/15 " +
  "origin-[var(--radix-tooltip-content-transform-origin)] data-[state=delayed-open]:animate-pop-in data-[state=instant-open]:animate-pop-in data-[state=closed]:animate-pop-out";

/** Hover/focus tooltip (Radix). The single child must be a focusable element. */
export function Tip({ content, children, side = "bottom", align = "center" }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side={side} align={align} sideOffset={8} collisionPadding={16} className={TOOLTIP_CLASS}>
          {content}
          <Tooltip.Arrow className="fill-abyss-900" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/**
 * A technical term with a dotted underline and a plain-language explanation.
 * Opens on hover, keyboard focus, or tap (Radix tooltips don't open on touch by default).
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
          // preventDefault stops Radix closing the tooltip on click, so a tap opens it
          onClick={(e) => {
            e.preventDefault();
            setOpen(true);
          }}
          className={`-my-[10px] inline-block cursor-help rounded py-[10px] text-left underline decoration-slate-400 decoration-dotted decoration-2 underline-offset-[6px] transition-all duration-300 ease-in-out hover:text-white hover:decoration-neon ${className}`}
        >
          {children ?? term}
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side="bottom" align="start" sideOffset={6} collisionPadding={16} className={TOOLTIP_CLASS}>
          <span className="mb-1 block font-display font-bold capitalize tracking-tight text-white">{term}</span>
          {text}
          <Tooltip.Arrow className="fill-abyss-900" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export const TooltipProvider = ({ children }) => (
  <Tooltip.Provider delayDuration={250} skipDelayDuration={150}>
    {children}
  </Tooltip.Provider>
);

/**
 * Button with a subtle magnetic pull (1-2px toward the cursor) and a press-in on tap.
 * Mouse only, off under reduced motion. Composes pointer handlers passed in by
 * Radix `asChild` triggers.
 */
export const MagneticButton = forwardRef(function MagneticButton(
  { strength = 2, whileHover, onPointerMove, onPointerLeave, style, disabled, children, ...props },
  ref,
) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 320, damping: 18, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 320, damping: 18, mass: 0.4 });

  return (
    <motion.button
      ref={ref}
      disabled={disabled}
      style={{ ...style, x: sx, y: sy }}
      whileHover={disabled ? undefined : whileHover}
      whileTap={disabled || reduce ? undefined : { scale: 0.96 }}
      onPointerMove={(e) => {
        onPointerMove?.(e);
        if (reduce || disabled || e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set(((e.clientX - (r.left + r.width / 2)) / (r.width / 2)) * strength);
        y.set(((e.clientY - (r.top + r.height / 2)) / (r.height / 2)) * strength);
      }}
      onPointerLeave={(e) => {
        onPointerLeave?.(e);
        x.set(0);
        y.set(0);
      }}
      {...props}
    >
      {children}
    </motion.button>
  );
});

/** Number that counts up from 0 when it first appears. Screen readers get the final value only. */
export function CountUp({ value, decimals = 0, duration = 0.9 }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const final = value.toFixed(decimals);
  useEffect(() => {
    if (reduce) {
      if (ref.current) ref.current.textContent = final;
      return;
    }
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => ref.current && (ref.current.textContent = v.toFixed(decimals)),
    });
    return () => controls.stop();
    // Only count on mount / when the value itself changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <>
      <span ref={ref} aria-hidden="true" className="tabular-nums">
        {reduce ? final : (0).toFixed(decimals)}
      </span>
      <span className="sr-only">{final}</span>
    </>
  );
}

/** Radial progress ring (Framer Motion pathLength) with optional centred content. */
export function ConfidenceRing({ value, color = "#22D3EE", size = 44, stroke = 3.5, children, delay = 0 }) {
  const r = (size - stroke) / 2;
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }} aria-hidden="true">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(14,116,144,0.35)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: value / 100 }}
          transition={{ duration: 1, delay, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      {children}
    </span>
  );
}

/**
 * Side drawer. Desktop: collapses to zero width so the canvas reclaims the space.
 * Mobile: slides in over the page with a backdrop.
 * Focus moves into the drawer on open and back to the toggle on close.
 */
export function Drawer({ id, side, open, onClose, children, label, returnFocusTo }) {
  const panelRef = useRef(null);
  const wasOpen = useRef(open);

  useEffect(() => {
    if (open && !wasOpen.current) panelRef.current?.focus();
    if (!open && wasOpen.current && panelRef.current?.contains(document.activeElement)) returnFocusTo?.current?.focus();
    wasOpen.current = open;
  }, [open, returnFocusTo]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && !e.defaultPrevented && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const hiddenX = side === "left" ? "-translate-x-full" : "translate-x-full";
  const margin = side === "left" ? "lg:mr-8" : "lg:ml-8";
  return (
    <>
      <div
        aria-hidden="true"
        data-backdrop
        onClick={onClose}
        className={`fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-in-out lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <aside
        id={id}
        aria-label={label}
        inert={open ? undefined : ""}
        className={`fixed inset-y-0 ${side === "left" ? "left-0" : "right-0"} z-[1001] w-[min(90vw,400px)] p-4 transition-all duration-300 ease-in-out
          lg:static lg:z-auto lg:h-full lg:shrink-0 lg:overflow-hidden lg:p-2 lg:translate-x-0
          ${open ? `translate-x-0 lg:w-[396px] lg:opacity-100 ${margin}` : `${hiddenX} lg:w-0 lg:opacity-0`}`}
      >
        <div ref={panelRef} tabIndex={-1} className="card flex h-full w-full flex-col overflow-y-auto lg:w-[380px]">
          {children}
        </div>
      </aside>
    </>
  );
}

/**
 * Height-animated disclosure region (CSS grid 0fr -> 1fr), so content of any
 * height slides open without measuring it. Hidden content is inert.
 */
export function Collapse({ open, id, children, className = "" }) {
  return (
    <div
      id={id}
      inert={open ? undefined : ""}
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out motion-reduce:transition-none ${
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      } ${className}`}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

const PATHS = {
  sliders: "M4 7h10M18 7h2M4 17h4M12 17h8M14 5v4M8 15v4",
  target: "M12 3v3M12 18v3M3 12h3M18 12h3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
  map: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14",
  pin: "M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Zm0-9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  gauge: "M12 14l4-4M4.9 19a9 9 0 1 1 14.2 0",
  chevron: "M6 9l6 6 6-6",
  download: "M12 4v12m0 0-4-4m4 4 4-4M4 20h16",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  close: "M6 6l12 12M18 6 6 18",
  upload: "M12 16V4m0 0-4 4m4-4 4 4M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3",
  info: "M12 11v5m0-8h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
  sound: "M4 9v6h4l5 4V5L8 9H4Zm12.5-.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12",
  mute: "M4 9v6h4l5 4V5L8 9H4Zm12 1 5 5m0-5-5 5",
  // Confidence levels: circle + check / half-filled circle / warning triangle
  check: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM8 12.5l2.5 2.5L16 9.5",
  half: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 3v18",
  alert: "M12 3 2 20h20L12 3Zm0 6v5m0 3h.01",
};

export function Icon({ name, className = "h-5 w-5", label }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={name === "more" ? 3 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {name === "half" && <path d="M12 3a9 9 0 0 0 0 18Z" fill="currentColor" stroke="none" />}
      <path d={PATHS[name]} />
    </svg>
  );
}

/** Icon + text confidence badge with a count-up, e.g. "✓ High confidence: 92%". */
export function ConfidenceLabel({ level, confidence, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-normal ${level.cls} ${className}`}>
      <Icon name={level.icon} className="h-4 w-4 shrink-0" />
      <span>
        {level.level} confidence:{" "}
        <span className="font-mono">
          <CountUp value={confidence} />%
        </span>
      </span>
    </span>
  );
}
