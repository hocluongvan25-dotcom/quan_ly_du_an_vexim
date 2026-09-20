import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#1A1208",
          900: "#24180C",
          800: "#332210",
          700: "#4A3218",
          600: "#5C3F1C",
        },
        teal: {
          700: "#9A6B08",
          600: "#C48912",
          500: "#E8B22A",
          400: "#F3C85A",
          100: "#FBEFCC",
          50: "#FFF8E6",
        },
        gold: {
          600: "#B8860B",
          500: "#E0B04A",
          400: "#F6D36B",
          100: "#FBF0C8",
        },
      },
      fontFamily: {
        sans: ["Be Vietnam Pro", "system-ui", "sans-serif"],
        display: ["Be Vietnam Pro", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 12px 40px -18px rgba(36, 24, 12, 0.16)",
        lift: "0 22px 50px -20px rgba(201, 148, 24, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
