import type { Config } from "tailwindcss";

/**
 * هوية بصرية لمكتب المحاماة — "السجل القانوني":
 *  - brand: أخضر أرشيفي غامق (جلود السجلات وقاعات المحاكم)
 *  - brass: نحاسي (الأختام والموازين) — للإبراز فقط
 *  - seal:  أحمر ختم الشمع — للعاجل والخطر فقط
 *  - paper: خلفية ورقية محايدة، وحبر داكن للنصوص
 */
const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-body)", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#EEF4F0",
          100: "#DCE9E1",
          200: "#BBD3C6",
          300: "#8FB5A3",
          400: "#5E927C",
          500: "#3D7660",
          600: "#28604C",
          700: "#1F4E3E",
          800: "#1B4034",
          900: "#16352C",
          950: "#0C201A",
        },
        brass: {
          50: "#F8F3E7",
          100: "#EFE4C8",
          200: "#E0CC96",
          300: "#CDAF63",
          400: "#B8933F",
          500: "#A17E2E",
          600: "#8A6A28",
          700: "#6F5423",
          800: "#5C4620",
          900: "#4E3C1E",
        },
        seal: {
          50: "#FBEDEB",
          100: "#F5D8D4",
          600: "#A3342C",
          700: "#8A2B24",
          800: "#72241E",
        },
        paper: "#F5F4EF",
        line: "#E4E2D9",
        ink: "#1C2521",
      },
    },
  },
  plugins: [],
};

export default config;
