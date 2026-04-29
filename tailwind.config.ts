import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Fraunces", "Newsreader", "serif"],
        read: ["Newsreader", "Fraunces", "serif"],
        sans: ["'Instrument Sans'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      colors: {
        paper: "var(--paper)",
        paper2: "var(--paper-2)",
        ink: "var(--ink)",
        ink2: "var(--ink-2)",
        muted: "var(--muted)",
        line: "var(--line)",
        lineSoft: "var(--line-soft)",
        amber: "var(--amber)",
        amberBg: "var(--amber-bg)",
        bordeaux: "var(--bordeaux)",
        bordeauxBg: "var(--bordeaux-bg)",
        moss: "var(--moss)",
        mossBg: "var(--moss-bg)",
        indigo: "var(--indigo)",
      },
    },
  },
  plugins: [],
};

export default config;
