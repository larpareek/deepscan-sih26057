// SEASCAN: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057)
// Site chrome: navbar (transparent over heroes, solid once scrolled), footer, the floating
// SEASCAN AI widget, and the dashboard, which stays mounted after the first visit so an
// operator's scan survives a trip to the map or the chat.
import { AnimatePresence, motion } from "framer-motion";
import { Menu, MessageCircle, X } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useScan } from "../lib/scanContext";

const DashboardPage = lazy(() => import("../pages/DashboardPage"));
const ChatPanel = lazy(() => import("./ChatPanel"));

const LINKS = [
  ["/", "Home"],
  ["/technology", "Technology"],
  ["/dashboard", "Dashboard"],
  ["/pipeline", "Pipeline"],
  ["/chat", "Chat"],
  ["/analytics", "Analytics"],
  ["/map", "Map"],
];

// Full-height tools: no footer, navbar always solid
const APP_ROUTES = new Set(["/dashboard", "/map", "/chat"]);

function SystemStatus() {
  const { backend } = useScan();
  const [color, label] = backend.pending
    ? ["bg-slate-400", "CONNECTING"]
    : backend.online
      ? ["bg-emerald-400", "SYSTEM ONLINE"]
      : ["bg-amber-400", "API OFFLINE"];
  return (
    <span className="flex items-center gap-2 whitespace-nowrap font-inter text-[11px] font-semibold tracking-[0.14em] text-cream/90">
      <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
        {backend.online && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${color} opacity-60`} />}
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${color}`} />
      </span>
      <span role="status">{label}</span>
    </span>
  );
}

function Navbar({ solid }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);

  const link = ({ isActive }) =>
    `relative py-1 text-[14px] font-medium transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-sunset after:transition-transform ${
      isActive ? "text-cream after:scale-x-100" : "text-cream/70 after:scale-x-0 hover:text-cream"
    }`;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-[1200] font-inter transition-[background-color,border-color,backdrop-filter] duration-300 ${
        solid || open ? "border-b border-white/10 bg-abyss/90 backdrop-blur-md" : "border-b border-transparent bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-14 max-w-[1600px] items-center gap-6 px-4 sm:px-6" aria-label="Main">
        <Link to="/" className="font-display text-xl font-black tracking-[0.12em] text-cream">
          SEASCAN
        </Link>
        <ul className="hidden items-center gap-6 lg:flex">
          {LINKS.map(([to, label]) => (
            <li key={to}>
              <NavLink to={to} end={to === "/"} className={link}>
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex items-center gap-3">
          <SystemStatus />
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-lg text-cream hover:bg-white/10 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>
      </nav>
      {open && (
        <ul id="mobile-nav" className="border-t border-white/10 px-4 pb-4 pt-2 lg:hidden">
          {LINKS.map(([to, label]) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  `block rounded-lg px-3 py-3 text-base font-medium ${isActive ? "bg-white/10 text-cream" : "text-cream/75 hover:bg-white/5"}`
                }
              >
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10 bg-abyss font-inter text-cream/70">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm sm:flex-row">
        <p>Built by Team BLACK SWANS | SIH 2026 | PS ID: SIH26057</p>
        <p className="text-xs text-cream/50">
          Photography:{" "}
          <a className="underline decoration-cream/30 underline-offset-2 hover:text-cream" href="https://unsplash.com/license" target="_blank" rel="noreferrer">
            Unsplash
          </a>{" "}
          (Oliver Tsappis, Naja Bertolt Jensen, NEOM, Sarah Lee)
        </p>
      </div>
    </footer>
  );
}

function ChatWidget() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  // /chat is the full conversation and /map has its own "Ask about this map" bar
  if (pathname === "/chat" || pathname === "/map") return null;

  return (
    <div className="font-inter">
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="SEASCAN AI"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-4 z-[1300] flex h-[min(560px,calc(100vh-8rem))] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-abyss-2 shadow-2xl shadow-black/60 sm:right-6"
          >
            <Suspense fallback={<p className="p-6 text-sm text-cream/60">Loading…</p>}>
              <ChatPanel compact onClose={() => setOpen(false)} />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "Close SEASCAN AI" : "Ask SEASCAN AI about the current scan"}
        className="fixed bottom-6 right-4 z-[1300] flex h-14 items-center gap-2 rounded-full bg-gradient-to-r from-biolum to-seafoam px-5 font-semibold text-abyss shadow-lg shadow-cyan-900/40 transition-transform hover:scale-[1.03] active:scale-100 sm:right-6"
      >
        {open ? <X size={20} aria-hidden="true" /> : <MessageCircle size={20} aria-hidden="true" />}
        <span className="hidden sm:inline">{open ? "Close" : "Ask SEASCAN AI"}</span>
      </button>
    </div>
  );
}

export default function Layout({ children }) {
  const { pathname } = useLocation();
  const onDash = pathname === "/dashboard";
  const appRoute = APP_ROUTES.has(pathname);
  const [scrolled, setScrolled] = useState(false);
  const [dashSeen, setDashSeen] = useState(onDash);

  useEffect(() => {
    if (onDash) setDashSeen(true);
  }, [onDash]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-abyss">
      <a href="#content" className="sr-only z-[1400] rounded bg-cream px-3 py-2 text-abyss focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Skip to content
      </a>
      <Navbar solid={scrolled || appRoute} />
      <div id="content">
        {children}
        {dashSeen && (
          <div hidden={!onDash} className="bg-bg pt-14 motion-safe:animate-[page-in_.35s_ease-out_.18s_both]">
            <Suspense fallback={<p className="p-8 text-ink-3">Loading console…</p>}>
              <DashboardPage />
            </Suspense>
          </div>
        )}
      </div>
      {!appRoute && <Footer />}
      <ChatWidget />
    </div>
  );
}
