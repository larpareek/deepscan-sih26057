// SEASCAN: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057)
// Editorial landing page: the story first (why ghost gear matters), the product second.
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, ChevronDown, FileText, MapPin, Search } from "lucide-react";
import { useRef } from "react";
import { Link } from "react-router-dom";

const reveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
};

const STATS = [
  { value: "640,000", unit: "tons", text: "of fishing gear lost or abandoned in the ocean every year", color: "text-sunset", src: 1 },
  { value: "100,000+", unit: "", text: "whales, seals, sea lions and turtles killed by ghost gear annually", color: "text-seafoam", src: 2 },
  { value: "< 1%", unit: "", text: "of the deep seafloor has ever been seen by human eyes or cameras", color: "text-cream", src: 3 },
];

const SOURCES = [
  "FAO / UNEP, Abandoned, lost or otherwise discarded fishing gear (2009)",
  "World Animal Protection, Ghosts beneath the waves (2018)",
  "Bell et al., How little we've seen, Science Advances (2025)",
];

const STEPS = [
  {
    icon: Search,
    title: "Detect",
    text: "Our model reads side-scan sonar the way a seasoned surveyor does: it picks out nets, wrecks and pipelines in the speckle, and ignores shadows that only look like objects.",
  },
  {
    icon: MapPin,
    title: "Locate",
    text: "Every find is pinned to a latitude and longitude from the vessel's own track, so a dive or recovery team knows exactly where to go.",
  },
  {
    icon: FileText,
    title: "Report",
    text: "One click turns a survey into a clear report, ranked by danger, ready for NIOT, the Coast Guard or a clean-up crew.",
  },
];

function Hero() {
  return (
    <section className="relative flex min-h-[100svh] items-end overflow-hidden bg-abyss">
      <img
        src="/img/hero-whale.webp"
        srcSet="/img/hero-whale-sm.webp 900w, /img/hero-whale.webp 2000w"
        sizes="100vw"
        alt=""
        fetchpriority="high"
        className="absolute inset-0 h-full w-full object-cover object-[60%_40%]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-abyss via-abyss/55 to-abyss/20" aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-r from-abyss/80 via-abyss/30 to-transparent" aria-hidden="true" />

      <div className="relative mx-auto w-full max-w-6xl px-6 pb-28 pt-32 sm:pb-32">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-5 font-inter text-xs font-semibold uppercase tracking-[0.28em] text-sunset"
        >
          Smart India Hackathon 2026 · SIH26057
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-4xl font-display text-5xl font-bold leading-[1.05] text-cream sm:text-6xl lg:text-7xl"
        >
          The Ocean Has a Secret. <span className="italic font-normal text-seafoam">We Built a Way to Find It.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.45 }}
          className="mt-6 max-w-2xl font-inter text-lg font-light leading-relaxed text-cream/85 sm:text-xl"
        >
          SEASCAN uses AI and side-scan sonar to locate ghost nets, shipwrecks, and marine debris — before they destroy more life.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.65 }}
          className="mt-10 flex flex-wrap gap-4 font-inter"
        >
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-biolum to-seafoam px-7 py-3.5 text-base font-semibold text-abyss shadow-lg shadow-cyan-500/20 transition-transform hover:scale-[1.03]"
          >
            Launch Dashboard <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <Link
            to="/technology"
            className="inline-flex items-center gap-2 rounded-full border border-cream/40 px-7 py-3.5 text-base font-medium text-cream backdrop-blur-sm transition-colors hover:border-cream hover:bg-white/10"
          >
            See How It Works
          </Link>
        </motion.div>
      </div>

      <p className="absolute bottom-4 left-6 hidden font-inter text-[11px] italic text-cream/55 sm:block">
        A humpback whale in open water. Photo: Oliver Tsappis / Unsplash
      </p>
      <a
        href="#problem"
        className="absolute bottom-6 left-1/2 grid h-11 w-11 -translate-x-1/2 place-items-center rounded-full text-cream/80 hover:text-cream"
        aria-label="Scroll to the story"
      >
        <ChevronDown size={28} className="motion-safe:animate-bounce" aria-hidden="true" />
      </a>
    </section>
  );
}

function Problem() {
  return (
    <section id="problem" className="relative scroll-mt-14 bg-abyss px-6 py-24 sm:py-32">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[5fr_7fr] lg:gap-20">
        <motion.figure {...reveal} className="relative">
          <img
            src="/img/ghost-net.webp"
            alt="A tangle of abandoned fishing line and a lure drifting underwater"
            loading="lazy"
            className="aspect-[3/4] w-full rounded-sm object-cover shadow-2xl shadow-black/60"
          />
          <div className="absolute -bottom-4 -right-4 -z-0 hidden h-full w-full border border-sunset/40 lg:block" aria-hidden="true" />
          <figcaption className="mt-4 font-inter text-xs italic text-cream/55">
            Lost gear keeps fishing long after it is abandoned. Photo: Naja Bertolt Jensen / Unsplash
          </figcaption>
        </motion.figure>

        <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.1 }}>
          <p className="font-inter text-xs font-semibold uppercase tracking-[0.28em] text-sunset">The problem</p>
          <blockquote className="mt-6">
            <p className="font-display text-3xl leading-snug text-cream sm:text-4xl lg:text-[2.75rem]">
              <span className="mr-1 font-black text-sunset" aria-hidden="true">
                “
              </span>
              640,000 tons of fishing gear are lost in our oceans every year. It keeps killing for decades.
            </p>
          </blockquote>
          <p className="mt-8 max-w-xl font-inter text-lg font-light leading-relaxed text-cream/75">
            Ghost nets drift and settle on the seabed, out of sight. Finding them means survey vessels towing sonar for days, and
            experts reading hours of grainy, grey images by hand. Most of what is down there is simply never seen.
          </p>
        </motion.div>
      </div>

      <div className="mx-auto mt-20 grid max-w-6xl gap-5 sm:grid-cols-3">
        {STATS.map((s, i) => (
          <motion.div
            key={s.value}
            {...reveal}
            transition={{ ...reveal.transition, delay: i * 0.12 }}
            className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent p-7"
          >
            <p className={`font-display text-5xl font-black ${s.color}`}>
              {s.value}
              {s.unit && <span className="ml-2 text-2xl font-bold">{s.unit}</span>}
            </p>
            <p className="mt-3 font-inter text-[15px] leading-relaxed text-cream/75">
              {s.text}
              <sup className="ml-0.5 text-cream/45">{s.src}</sup>
            </p>
          </motion.div>
        ))}
      </div>
      <ol className="mx-auto mt-6 max-w-6xl list-decimal space-y-0.5 pl-5 font-inter text-xs text-cream/45">
        {SOURCES.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
    </section>
  );
}

function WhyItMatters() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-12%", "12%"]);
  return (
    <section ref={ref} className="relative grid min-h-[85vh] place-items-center overflow-hidden bg-abyss px-6">
      <motion.img
        src="/img/coral-reef.webp"
        alt=""
        loading="lazy"
        style={{ y }}
        className="absolute inset-x-0 -top-[15%] h-[130%] w-full object-cover"
      />
      <div className="absolute inset-0 bg-abyss/65" aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-b from-abyss via-transparent to-abyss" aria-hidden="true" />
      <motion.div {...reveal} className="relative max-w-4xl text-center">
        <p className="font-inter text-xs font-semibold uppercase tracking-[0.28em] text-seafoam">Why it matters</p>
        <p className="mt-6 font-display text-3xl leading-snug text-cream sm:text-5xl sm:leading-tight">
          Ghost nets don&apos;t just kill fish. They smother coral, entangle whales, and destroy{" "}
          <em className="text-sunset">entire ecosystems.</em>
        </p>
      </motion.div>
      <p className="absolute bottom-4 right-6 font-inter text-[11px] italic text-cream/55">Photo: NEOM / Unsplash</p>
    </section>
  );
}

function HowItHelps() {
  return (
    <section className="bg-abyss px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <motion.div {...reveal} className="max-w-2xl">
          <p className="font-inter text-xs font-semibold uppercase tracking-[0.28em] text-sunset">How SEASCAN helps</p>
          <h2 className="mt-4 font-display text-4xl font-bold leading-tight text-cream sm:text-5xl">
            Hours of sonar, read in seconds.
          </h2>
        </motion.div>
        <ol className="mt-14 grid gap-6 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <motion.li
              key={title}
              {...reveal}
              transition={{ ...reveal.transition, delay: i * 0.12 }}
              className="group relative rounded-2xl border border-white/10 bg-abyss-2 p-8 transition-colors hover:border-seafoam/40"
            >
              <span className="absolute right-7 top-6 font-display text-5xl font-black text-white/[0.06]" aria-hidden="true">
                0{i + 1}
              </span>
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-seafoam/10 text-seafoam">
                <Icon size={22} aria-hidden="true" />
              </span>
              <h3 className="mt-6 font-display text-2xl font-bold text-cream">{title}</h3>
              <p className="mt-3 font-inter leading-relaxed text-cream/70">{text}</p>
            </motion.li>
          ))}
        </ol>
        <motion.p {...reveal} className="mt-10 font-inter">
          <Link to="/pipeline" className="inline-flex items-center gap-2 font-medium text-biolum hover:underline">
            Follow a scan through the pipeline <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </motion.p>
      </div>
    </section>
  );
}

function FooterCta() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-sunset via-orange-300 to-cream px-6 py-24 sm:py-28">
      <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/20 blur-3xl" aria-hidden="true" />
      <motion.div {...reveal} className="relative mx-auto max-w-4xl text-center">
        <h2 className="font-display text-4xl font-black leading-tight text-abyss sm:text-6xl">Ready to see what&apos;s really down there?</h2>
        <p className="mx-auto mt-5 max-w-xl font-inter text-lg text-abyss/80">
          Explore the demo survey off Chennai, or drop in your own side-scan sonar image.
        </p>
        <Link
          to="/dashboard"
          className="mt-10 inline-flex items-center gap-3 rounded-full bg-abyss px-9 py-4 font-inter text-lg font-semibold text-cream shadow-xl shadow-orange-900/30 transition-transform hover:scale-[1.03]"
        >
          Open SEASCAN Dashboard <ArrowRight size={20} aria-hidden="true" />
        </Link>
      </motion.div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <>
      <Hero />
      <Problem />
      <WhyItMatters />
      <HowItHelps />
      <FooterCta />
    </>
  );
}
