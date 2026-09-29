// DeepScan: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057)
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      // Instrument palette built on IBM Carbon's Cool Gray scale (chrome) with a single
      // interactive accent (Carbon Blue 40) and Carbon's dark-theme support colours for status.
      // Every text colour here is >= 4.5:1 on every surface (WCAG AA).
      colors: {
        bg: { DEFAULT: "#121619", 1: "#0E1114", 2: "#0A0D0F" },
        surface: { DEFAULT: "#1B2023", 2: "#21272A", 3: "#2A3034" },
        line: { DEFAULT: "#2c3236", strong: "#3d444a" },
        ink: { DEFAULT: "#F2F4F8", 2: "#C1C7CD", 3: "#979DA5" },
        accent: { DEFAULT: "#78A9FF", hover: "#A6C8FF", dim: "#1C2F4D" },
        warn: { DEFAULT: "#F1C21B" },
        crit: { DEFAULT: "#FA4D56", text: "#FF8389" },
        ok: { DEFAULT: "#42BE65" },
        review: { DEFAULT: "#A2A9B0" },
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
