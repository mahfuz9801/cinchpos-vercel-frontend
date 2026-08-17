/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        cinch: {
          black: "#050807",
          charcoal: "#0B1210",
          panel: "#101A17",
          deep: "#022C22",
          forest: "#0F3D2E",
          emerald: "#1ED760",
          mint: "#4ADE80",
          soft: "#E6F4EA",
          slate: "#9FB3A8",
          cool: "#94A3B8",
          muted: "#5F7368",
          line: "#1A2A24",
          success: "#22C55E",
          warning: "#F59E0B",
          danger: "#EF4444",
          blue: "#3B82F6"
        }
      },
      fontFamily: {
        sans: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "Manrope", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        glow: "0 24px 70px rgba(74, 222, 128, 0.18)",
        glowStrong: "0 28px 90px rgba(34, 197, 94, 0.28)",
        soft: "0 24px 70px rgba(5, 8, 7, 0.18)"
      },
      backgroundImage: {
        grid:
          "linear-gradient(rgba(159, 179, 168, 0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(159, 179, 168, 0.09) 1px, transparent 1px)"
      }
    }
  },
  plugins: []
};
