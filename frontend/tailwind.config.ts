import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#101828", 2: "#344054" },
        muted: "#4A5565",
        faint: "#667085",
        line: "#D5DAE1",
        hair: "#EAECF0",
        ground: "#E7EAEE",
        soft: "#F5F6F8",
        stub: "#FAFBFC",
        accent: "rgb(var(--accent) / <alpha-value>)",
        ok: { bg: "#D1FADF", fg: "#05603A", deep: "#054F31", line: "#039855" },
        bad: { bg: "#FEE4E2", fg: "#B42318", line: "#D92D20", flash: "#FECDCA" },
        rule: { bg: "#EAF0FF", fg: "#1D4ED8" },
        pay: { bg: "#FFF1EA", fg: "#B93A0C" },
      },
      fontFamily: {
        sans: ['"Instrument Sans"', "system-ui", "sans-serif"],
        mono: ['"DM Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        hair: "0 1px 0 rgba(16,24,40,.08)",
        card: "0 1px 0 rgba(16,24,40,.08), 0 8px 24px -12px rgba(16,24,40,.18)",
        pass: "0 30px 60px -30px rgba(16,24,40,.35)",
      },
    },
  },
  plugins: [],
};

export default config;
