import type { Config } from "tailwindcss";

const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: token("bg"), sunken: token("bg-sunken") },
        surface: { DEFAULT: token("surface"), raised: token("surface-raised"), overlay: token("surface-overlay") },
        line: { DEFAULT: token("line"), strong: token("line-strong") },
        fg: { DEFAULT: token("fg"), muted: token("fg-muted"), subtle: token("fg-subtle"), inverse: token("fg-inverse") },
        accent: { DEFAULT: token("accent"), hover: token("accent-hover") },
        accepted: token("accepted"),
        rejected: token("rejected"),
        open: token("open"),
        verified: token("verified"),
        unverified: token("unverified"),
        conflict: token("conflict"),
        chart: {
          1: token("chart-1"),
          2: token("chart-2"),
          3: token("chart-3"),
          4: token("chart-4"),
          grid: token("chart-grid"),
        },
      },
      fontFamily: {
        sans: ['"Geist Variable"', "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ['"Geist Mono Variable"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        "2xs": ["11px", { lineHeight: "16px" }],
        xs: ["12px", { lineHeight: "16px" }],
        sm: ["13px", { lineHeight: "20px" }],
        base: ["14px", { lineHeight: "22px" }],
        md: ["15px", { lineHeight: "24px" }],
        lg: ["16px", { lineHeight: "24px", letterSpacing: "-0.005em" }],
        xl: ["20px", { lineHeight: "28px", letterSpacing: "-0.012em" }],
        "2xl": ["24px", { lineHeight: "32px", letterSpacing: "-0.018em" }],
        "3xl": ["30px", { lineHeight: "36px", letterSpacing: "-0.022em" }],
        "4xl": ["40px", { lineHeight: "44px", letterSpacing: "-0.03em" }],
        "5xl": ["56px", { lineHeight: "58px", letterSpacing: "-0.035em" }],
        "6xl": ["72px", { lineHeight: "72px", letterSpacing: "-0.04em" }],
      },
      borderRadius: {
        none: "0",
        sm: "4px",
        DEFAULT: "6px",
        md: "6px",
        lg: "8px",
        xl: "12px",
        full: "9999px",
      },
      boxShadow: {
        overlay: "var(--shadow-overlay)",
        none: "none",
      },
      spacing: {
        sidebar: "var(--sidebar-width)",
        "sidebar-collapsed": "var(--sidebar-collapsed-width)",
        topbar: "var(--topbar-height)",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        shimmer: { "0%": { opacity: "0.55" }, "50%": { opacity: "1" }, "100%": { opacity: "0.55" } },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
      },
      animation: {
        shimmer: "shimmer 1.6s ease-in-out infinite",
        "fade-in": "fade-in 120ms ease-out",
      },
    },
  },
  plugins: [],
} satisfies Config;
