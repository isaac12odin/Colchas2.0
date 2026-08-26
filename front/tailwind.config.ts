import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./componentes/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
    "./modulos/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        marca: {
          50: "#edf5ff",
          100: "#d0e2ff",
          500: "#0f62fe",
          600: "#0353e9",
          700: "#0043ce",
          900: "#001d6c",
        },
      },
      boxShadow: {
        panel: "0 1px 2px rgba(0,0,0,.08), 0 8px 28px rgba(15,98,254,.06)",
      },
    },
  },
  plugins: [],
} satisfies Config;
