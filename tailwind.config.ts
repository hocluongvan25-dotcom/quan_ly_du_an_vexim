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
          950: "#061824",
          900: "#0A2F4A",
          800: "#0E3D5E",
          700: "#164E72",
          600: "#1C638F",
        },
        teal: {
          700: "#0C6E6A",
          600: "#128C86",
          500: "#1AA7A1",
          400: "#2BC4BD",
          100: "#D7F4F2",
          50: "#EEFAF9",
        },
        gold: {
          600: "#B08A14",
          500: "#C9A227",
          400: "#E0BC4A",
          100: "#F8EFC7",
        },
      },
      fontFamily: {
        sans: ["Be Vietnam Pro", "Plus Jakarta Sans", "system-ui", "sans-serif"],
        display: ["Plus Jakarta Sans", "Be Vietnam Pro", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 10px 40px -18px rgba(10, 47, 74, 0.18)",
        lift: "0 18px 50px -20px rgba(10, 47, 74, 0.28)",
      },
    },
  },
  plugins: [],
};

export default config;
