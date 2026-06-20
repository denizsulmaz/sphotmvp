import type { Config } from "tailwindcss";

/**
 * Brand colors are driven by CSS variables defined in src/app/globals.css
 * (the single source of truth). Update the hex values there once and both
 * Tailwind utility classes (bg-accent, text-foreground, …) and raw CSS update.
 * JS-side brand values live in src/lib/brand.ts.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Colors use the `rgb(var(--x) / <alpha-value>)` channel technique so
      // Tailwind opacity modifiers (e.g. bg-accent/20) keep working while the
      // values stay driven by the CSS variables in globals.css.
      colors: {
        accent: "rgb(var(--accent) / <alpha-value>)",
        "accent-foreground": "rgb(var(--accent-foreground) / <alpha-value>)",
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        "brand-border": "rgb(var(--border) / <alpha-value>)",
      },
      fontFamily: {
        // Mirrors the next/font variable set in layout.tsx.
        sans: ["var(--font-brand)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
