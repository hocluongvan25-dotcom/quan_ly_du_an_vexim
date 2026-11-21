import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Legacy token names retained so existing utility classes inherit the
        // shared Apple-inspired neutral and blue palette across every page.
        navy: {
          50: "#f5f5f7",
          100: "#f2f2f7",
          200: "#e5e5ea",
          300: "#d2d2d7",
          400: "#aeaeb2",
          500: "#86868b",
          600: "#6e6e73",
          700: "#48484a",
          800: "#3a3a3c",
          900: "#1d1d1f",
          950: "#121213",
        },
        blue: {
          50: "#f5faff",
          100: "#e8f2ff",
          200: "#cce4ff",
          300: "#99caff",
          400: "#2997ff",
          500: "#0071e3",
          600: "#0066cc",
          700: "#005fbd",
          800: "#004fa6",
          900: "#004489",
          950: "#00376d",
        },
        teal: {
          50: "#f5faff",
          100: "#e8f2ff",
          200: "#cce4ff",
          300: "#99caff",
          400: "#2997ff",
          500: "#0071e3",
          600: "#0066cc",
          700: "#005fbd",
          800: "#004fa6",
          900: "#004489",
          950: "#00376d",
        },
        // Legacy warm-color utility names now resolve to the same neutral blue accent ramp.
        amber: {
          50: "#f5faff",
          100: "#e8f2ff",
          200: "#cce4ff",
          300: "#99caff",
          400: "#2997ff",
          500: "#0071e3",
          600: "#0066cc",
          700: "#005fbd",
          800: "#004fa6",
          900: "#004489",
          950: "#00376d",
        },
        orange: {
          50: "#f5faff",
          100: "#e8f2ff",
          200: "#cce4ff",
          300: "#99caff",
          400: "#2997ff",
          500: "#0071e3",
          600: "#0066cc",
          700: "#005fbd",
          800: "#004fa6",
          900: "#004489",
          950: "#00376d",
        },
        gold: {
          50: "#f5faff",
          100: "#e8f2ff",
          200: "#cce4ff",
          300: "#99caff",
          400: "#2997ff",
          500: "#0071e3",
          600: "#0066cc",
          700: "#005fbd",
          800: "#004fa6",
          900: "#004489",
          950: "#00376d",
        },
      },
      fontFamily: {
        sans: ["Be Vietnam Pro", "system-ui", "sans-serif"],
        display: ["Be Vietnam Pro", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 12px 40px -18px rgba(29, 29, 31, 0.12)",
        lift: "0 22px 50px -20px rgba(0, 113, 227, 0.2)",
      },
    },
  },
  plugins: [],
};

export default config;
