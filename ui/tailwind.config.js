/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      // "Bioluminescent Deep Sea". Every text colour used on these surfaces is >= 4.5:1 (WCAG AA).
      colors: {
        abyss: {
          DEFAULT: "#020617", // Deep Abyss
          900: "#040B1F",
          800: "#0A1630",
          700: "#0F2140",
          600: "#162C52",
        },
        neon: {
          DEFAULT: "#22D3EE", // Bioluminescent Cyan
          soft: "#A5F3FC",
          dim: "#0E7490", // Midnight Teal (fills, tracks; not for text)
        },
        teal: {
          DEFAULT: "#0E7490",
        },
        hazard: {
          DEFAULT: "#F472B6", // Soft Coral Glow (alerts)
          vivid: "#F472B6",
          amber: "#FBBF24",
          green: "#5EEAD4",
        },
      },
      fontFamily: {
        sans: ['"Inter"', "system-ui", "sans-serif"],
        display: ['"Space Grotesk"', '"Inter"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        neon: "0 0 6px rgba(34,211,238,.55), 0 0 18px rgba(34,211,238,.25)",
        "neon-lg": "0 0 12px rgba(34,211,238,.75), 0 0 36px rgba(34,211,238,.35)",
        hazard: "0 0 6px rgba(244,114,182,.7), 0 0 18px rgba(244,114,182,.35)",
      },
      keyframes: {
        // Popovers / tooltips (Radix sets data-state=open|closed and waits for exit animations)
        "pop-in": {
          "0%": { opacity: "0", transform: "translateY(-4px) scale(.97)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "pop-out": {
          "0%": { opacity: "1", transform: "scale(1)" },
          "100%": { opacity: "0", transform: "scale(.97)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "pop-in": "pop-in 180ms cubic-bezier(.16,1,.3,1)",
        "pop-out": "pop-out 120ms ease-in",
        "fade-in": "fade-in 400ms ease-in-out",
      },
    },
  },
  plugins: [],
};
