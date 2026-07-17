import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-cairo)", "Tahoma", "Arial", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#f0f6ff",
          100: "#dceaff",
          200: "#c0d8ff",
          300: "#93bcff",
          400: "#5f95ff",
          500: "#3b6ef5",
          600: "#2450db",
          700: "#1d3fb0",
          800: "#1d388c",
          900: "#1d3372",
          950: "#152045",
        },
      },
    },
  },
  plugins: [],
};

export default config;
