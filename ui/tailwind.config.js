// DeepScan: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057)
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      // Sonar-workstation palette. Neutral surfaces dominate; accent is reserved for
      // interaction and the sweep; status colours appear only on status.
      // Every text colour here is >= 4.5:1 on every surface (WCAG AA).
      colors: {
        bg: { DEFAULT: "#071018", 1: "#0A141D", 2: "#0E1923" },
        surface: { DEFAULT: "#111E29", 2: "#15232E", 3: "#192A35" },
        line: { DEFAULT: "#243744", strong: "#304652" },
        ink: { DEFAULT: "#E6EEF2", 2: "#A8BBC5", 3: "#8DA2AD" },
        accent: { DEFAULT: "#38B6C9", hover: "#4CC3D4", dim: "#1B4A55" },
        warn: { DEFAULT: "#E4A83A" },
        crit: { DEFAULT: "#D95757", text: "#EE7B7B" },
        ok: { DEFAULT: "#4BAF7A" },
        review: { DEFAULT: "#8FA3AE" },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": ["11px", { lineHeight: "16px" }],
      },
      keyframes: {
        "pop-in": {
          "0%": { opacity: "0", transform: "translateY(-2px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pop-out": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        sweep: {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(var(--sweep-h, 600px))" },
        },
        indeterminate: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(250%)" },
        },
      },
      animation: {
        "pop-in": "pop-in 140ms ease-out",
        "pop-out": "pop-out 100ms ease-in",
        sweep: "sweep 7s linear infinite",
        indeterminate: "indeterminate 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
