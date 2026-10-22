import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Bảng màu cũ của hệ thống quản lý nội bộ (giữ nguyên) */
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
        /* Bảng màu website công khai, lấy theo màu logo Vexim */
        ink: {
          DEFAULT: "#161A20",
          800: "#232932",
          700: "#3A424D",
          500: "#5D6672",
          400: "#858D97",
          300: "#B3B9C1",
        },
        paper: {
          DEFAULT: "#FAF8F3",
          deep: "#F1EDE4",
          card: "#FFFFFF",
        },
        brand: {
          950: "#0A1B30",
          900: "#102944",
          800: "#16385C",
          700: "#1E4773",
          600: "#2A5B8C",
          500: "#3D74A8",
          200: "#C2D5E7",
          100: "#DCE7F1",
          50: "#EFF4F8",
        },
        brass: {
          700: "#77591B",
          600: "#94722B",
          500: "#AE8A3C",
          300: "#D7C28B",
          100: "#F2E9D3",
        },
        line: {
          DEFAULT: "#E3DED3",
          strong: "#CFC8B9",
        },
        okay: "#1D6B4A",
        warn: "#8A5A11",
        fail: "#8C2F2F",
      },
      fontFamily: {
        sans: ["Be Vietnam Pro", "system-ui", "sans-serif"],
        display: ["Be Vietnam Pro", "system-ui", "sans-serif"],
        serif: ["Lora", "Georgia", "Times New Roman", "serif"],
      },
      boxShadow: {
        card: "0 12px 40px -18px rgba(36, 24, 12, 0.16)",
        lift: "0 22px 50px -20px rgba(201, 148, 24, 0.35)",
        panel: "0 24px 60px -32px rgba(10, 27, 48, 0.35)",
      },
      maxWidth: {
        site: "1180px",
      },
      letterSpacing: {
        label: "0.18em",
        wordmark: "0.34em",
      },
    },
  },
  plugins: [],
};

export default config;
