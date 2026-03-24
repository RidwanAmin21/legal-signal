import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Semantic — map to CSS vars */
        background:    "var(--background)",
        "bg-secondary":"var(--bg-secondary)",
        "bg-card":     "var(--bg-card)",
        "bg-input":    "var(--bg-input)",
        foreground:    "var(--foreground)",
        secondary:     "var(--text-secondary)",
        muted:         "var(--muted)",
        accent:        "var(--accent)",
        "accent-muted":"var(--accent-muted)",
        border:        "var(--border)",
        card:          "var(--bg-card)",
        success:       "var(--success)",
        error:         "var(--error)",
        warning:       "var(--warning)",
        info:          "var(--info)",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        sans:    ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        mono:    ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        DEFAULT: "6px",
        md: "8px",
        lg: "12px",
        xl: "12px",
        "2xl": "12px",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0,0,0,0.4), 0 1px 2px -1px rgba(0,0,0,0.4)",
        gold: "0 0 0 1px #C9A84C",
      },
    },
  },
  plugins: [],
};
export default config;
