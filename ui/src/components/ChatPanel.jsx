// SEASCAN: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057)
// SEASCAN AI conversation: used full-size on /chat and compact in the floating widget.
// Questions go to the backend's /chat endpoint with the current scan as context; the
// Gemini key lives only on the server.
import { ArrowUp, Bot, RotateCcw, Sparkles, X } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import { askSeascan } from "../lib/api";
import { chatContext, useScan } from "../lib/scanContext";

export const SUGGESTIONS = [
  "What is the most dangerous hazard here?",
  "Give me a summary of the findings.",
  "Which objects need manual review, and why?",
  "How far is the nearest ghost net from Chennai?",
];

/** Minimal formatting for model replies: paragraphs, "- " / "* " bullets and **bold**. */
function inline(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i} className="font-semibold text-cream">{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
  );
}

export function RichText({ text }) {
  const blocks = [];
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)$/);
    if (bullet) {
      const last = blocks[blocks.length - 1];
      if (last?.type === "ul") last.items.push(bullet[1]);
      else blocks.push({ type: "ul", items: [bullet[1]] });
    } else if (line.trim()) {
      blocks.push({ type: "p", text: line.replace(/^#+\s*/, "") });
    }
  }
  return (
    <div className="space-y-2">
      {blocks.map((b, i) =>
        b.type === "ul" ? (
          <ul key={i} className="list-disc space-y-1 pl-5 marker:text-biolum">
            {b.items.map((it, j) => (
              <li key={j}>{inline(it)}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>{inline(b.text)}</p>
        ),
      )}
    </div>
  );
}

export function Thinking({ label = "SEASCAN AI is analyzing..." }) {
  return (
    <div className="flex items-center gap-3 text-sm text-cream/70" role="status">
      <span className="flex gap-1" aria-hidden="true">
        <i className="typing-dot h-1.5 w-1.5 rounded-full bg-biolum" />
        <i className="typing-dot h-1.5 w-1.5 rounded-full bg-biolum" />
        <i className="typing-dot h-1.5 w-1.5 rounded-full bg-biolum" />
      </span>
      {label}
    </div>
  );
}

function modelLabel(model) {
  if (!model) return null;
  return model === "offline" ? "Automatic summary (language model unavailable)" : `Gemini · ${model}`;
}

/** Hook: send a question with the current scan (and recent turns) as context. */
export function useSeascanChat() {
  const { scan, messages, setMessages } = useScan();
  const [busy, setBusy] = useState(false);
  const ctlRef = useRef(null);
  useEffect(() => () => ctlRef.current?.abort(), []);

  const send = async (text, extraContext) => {
    const q = text.trim();
    if (!q || busy) return;
    const history = messages.filter((m) => !m.error).slice(-6).map((m) => ({ role: m.role, text: m.text.slice(0, 1200) }));
    setMessages((m) => [...m, { role: "user", text: q, scan: scan.name }]);
    setBusy(true);
    ctlRef.current = new AbortController();
    try {
      const ctx = { ...chatContext(scan), ...extraContext, conversation: history };
      const res = await askSeascan(q, ctx, ctlRef.current.signal);
      setMessages((m) => [...m, { role: "assistant", text: res.reply, model: res.model }]);
    } catch (e) {
      if (e.name === "AbortError") return;
      const offline = /fetch|network/i.test(e.message);
      setMessages((m) => [
        ...m,
        { role: "assistant", error: true, retry: q, text: offline ? "Can't reach the SEASCAN backend right now. Check that the system is online and try again." : e.message },
      ]);
    } finally {
      setBusy(false);
    }
  };
  return { messages, setMessages, busy, send, scan };
}

export default function ChatPanel({ compact = false, onClose }) {
  const { messages, setMessages, busy, send, scan } = useSeascanChat();
  const [draft, setDraft] = useState("");
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);
  useEffect(() => {
    if (compact) inputRef.current?.focus();
  }, [compact]);

  const submit = (text) => {
    send(text);
    setDraft("");
  };

  const pad = compact ? "px-4" : "px-5 sm:px-8";
  const counts = scan.detections.reduce((acc, d) => ((acc[d.status.label] = (acc[d.status.label] ?? 0) + 1), acc), {});

  return (
    <div className="flex h-full min-h-0 flex-col font-inter text-cream">
      <div className={`flex items-center gap-3 border-b border-white/10 py-3 ${pad}`}>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-biolum to-seafoam text-abyss" aria-hidden="true">
          <Bot size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className={`font-display font-bold ${compact ? "text-lg" : "text-2xl"}`}>SEASCAN AI</h2>
          <p className="truncate text-xs text-cream/60">
            Context: {scan.name} · {scan.detections.length} objects
            {counts.CRITICAL ? ` · ${counts.CRITICAL} critical` : ""}
          </p>
        </div>
        {messages.length > 0 && (
          <button type="button" onClick={() => setMessages([])} className="grid h-9 w-9 place-items-center rounded-lg text-cream/70 hover:bg-white/10 hover:text-cream" aria-label="Clear conversation" title="Clear conversation">
            <RotateCcw size={16} aria-hidden="true" />
          </button>
        )}
        {onClose && (
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg text-cream/70 hover:bg-white/10 hover:text-cream" aria-label="Close SEASCAN AI">
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      <div ref={listRef} className={`min-h-0 flex-1 overflow-y-auto py-5 ${pad}`} aria-live="polite">
        {messages.length === 0 ? (
          <div className={`mx-auto flex h-full max-w-2xl flex-col justify-center ${compact ? "gap-4" : "gap-6"}`}>
            <div>
              <Sparkles className="mb-3 text-sunset" size={compact ? 22 : 28} aria-hidden="true" />
              <p className={`font-display ${compact ? "text-xl" : "text-3xl"} leading-snug`}>Ask anything about what the sonar found.</p>
              <p className="mt-2 text-sm text-cream/60">Answers are grounded in the detections from {scan.name.toLowerCase().startsWith("demo") ? "the demo survey" : scan.name}.</p>
            </div>
            <ul className={`grid gap-2 ${compact ? "" : "sm:grid-cols-2"}`}>
              {SUGGESTIONS.slice(0, compact ? 3 : 4).map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => submit(s)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm text-cream/85 transition-colors hover:border-biolum/50 hover:bg-biolum/5"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ol className="mx-auto max-w-3xl space-y-4">
            {messages.map((m, i) => (
              <li key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
                    m.role === "user"
                      ? "rounded-br-md bg-sunset/90 text-abyss"
                      : m.error
                        ? "rounded-bl-md border border-amber-400/40 bg-amber-400/10 text-cream"
                        : "rounded-bl-md border border-white/10 bg-abyss-3 text-cream/90"
                  }`}
                >
                  <span className="sr-only">{m.role === "user" ? "You said:" : "SEASCAN AI:"}</span>
                  {m.role === "user" ? <p className="whitespace-pre-wrap">{m.text}</p> : <RichText text={m.text} />}
                  {m.model && <p className="mt-2 text-[11px] uppercase tracking-wider text-cream/45">{modelLabel(m.model)}</p>}
                  {m.error && m.retry && (
                    <button type="button" onClick={() => send(m.retry)} className="mt-2 text-sm font-medium text-biolum underline underline-offset-2">
                      Try again
                    </button>
                  )}
                </div>
              </li>
            ))}
            {busy && (
              <li className="flex">
                <div className="rounded-2xl rounded-bl-md border border-white/10 bg-abyss-3 px-4 py-3">
                  <Thinking />
                </div>
              </li>
            )}
          </ol>
        )}
      </div>

      <form
        className={`border-t border-white/10 py-3 ${pad}`}
        onSubmit={(e) => {
          e.preventDefault();
          submit(draft);
        }}
      >
        <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-white/15 bg-abyss-3 p-2 focus-within:border-biolum/60">
          <label htmlFor={compact ? "chat-mini" : "chat-main"} className="sr-only">
            Ask SEASCAN AI
          </label>
          <textarea
            id={compact ? "chat-mini" : "chat-main"}
            ref={inputRef}
            rows={1}
            value={draft}
            maxLength={1000}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(draft);
              }
            }}
            placeholder="Ask about hazards, locations, sizes…"
            className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-[15px] text-cream placeholder:text-cream/40 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!draft.trim() || busy}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-biolum text-abyss transition-opacity disabled:opacity-30"
            aria-label="Send question"
          >
            <ArrowUp size={18} aria-hidden="true" />
          </button>
        </div>
        {!compact && <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-cream/40">SEASCAN AI can be wrong. Verify positions against the survey report before acting.</p>}
      </form>
    </div>
  );
}
