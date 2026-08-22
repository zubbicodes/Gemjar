import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--ink) / <alpha-value>)",
        paper: "rgb(var(--paper) / <alpha-value>)",
        forest: "rgb(var(--forest) / <alpha-value>)",
        moss: "rgb(var(--moss) / <alpha-value>)",
        gold: "rgb(var(--gold) / <alpha-value>)",
        mist: "rgb(var(--mist) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-karla)", "sans-serif"],
        display: ["var(--font-jost)", "sans-serif"],
      },
      boxShadow: {
        lift: "0 28px 80px -36px rgb(18 30 26 / 0.32)",
        soft: "0 16px 44px -30px rgb(18 30 26 / 0.3)",
      },
      animation: {
        "fade-up": "fade-up .7s ease-out both",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
