// SEASCAN: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057)
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Component, lazy, Suspense } from "react";
import { BrowserRouter, Link, Route, Routes, useLocation } from "react-router-dom";
import Layout from "./components/Layout";
import { TooltipProvider } from "./components/ui";
import { ScanProvider } from "./lib/scanContext";
import LandingPage from "./pages/LandingPage";

// Heavier pages (charts, maps, animation-rich sections) load on demand
const TechnologyPage = lazy(() => import("./pages/TechnologyPage"));
const PipelinePage = lazy(() => import("./pages/PipelinePage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const MapPage = lazy(() => import("./pages/MapPage"));

/** A lazy page can fail to load (offline, or an old tab after a new deploy): offer a reload. */
class PageErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section className="grid min-h-[70vh] place-items-center bg-abyss px-6 pt-14 text-center font-inter text-cream">
        <div>
          <p className="font-display text-3xl">This page didn&apos;t load.</p>
          <p className="mt-2 text-cream/65">Check the connection, or reload to get the latest version of SEASCAN.</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-6 rounded-full bg-cream px-6 py-3 font-semibold text-abyss">
            Reload
          </button>
        </div>
      </section>
    );
  }
}

function Page({ children }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="site-focus"
    >
      <PageErrorBoundary>
        <Suspense fallback={<div className="min-h-screen bg-abyss" />}>{children}</Suspense>
      </PageErrorBoundary>
    </motion.main>
  );
}

function NotFound() {
  return (
    <section className="grid min-h-[70vh] place-items-center bg-abyss px-6 pt-14 text-center font-inter text-cream">
      <div>
        <p className="font-display text-6xl font-black text-sunset">404</p>
        <p className="mt-3 text-lg text-cream/70">Nothing on the sonar here.</p>
        <Link to="/" className="mt-6 inline-block rounded-full border border-cream/30 px-5 py-2.5 font-medium hover:bg-white/10">
          Back to the surface
        </Link>
      </div>
    </section>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Page><LandingPage /></Page>} />
        <Route path="/technology" element={<Page><TechnologyPage /></Page>} />
        {/* The dashboard is rendered (and kept alive) by Layout so its scan survives navigation */}
        <Route path="/dashboard" element={null} />
        <Route path="/pipeline" element={<Page><PipelinePage /></Page>} />
        <Route path="/chat" element={<Page><ChatPage /></Page>} />
        <Route path="/analytics" element={<Page><AnalyticsPage /></Page>} />
        <Route path="/map" element={<Page><MapPage /></Page>} />
        <Route path="*" element={<Page><NotFound /></Page>} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        <TooltipProvider>
          <ScanProvider>
            <Layout>
              <AnimatedRoutes />
            </Layout>
          </ScanProvider>
        </TooltipProvider>
      </MotionConfig>
    </BrowserRouter>
  );
}
