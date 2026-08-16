/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/renderer/**/*.{html,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Inter",
          "Helvetica Neue",
          "Arial",
          "sans-serif"
        ],
        mono: ["SF Mono", "Menlo", "Consolas", "monospace"]
      },
      colors: {
        canvas: {
          light: "#fafafa",
          dark: "#18181a"
        },
        surface: {
          light: "#ffffff",
          dark: "#1f1f22"
        },
        border: {
          light: "#e7e7e8",
          dark: "#2c2c30"
        },
        accent: {
          DEFAULT: "#3b6cf6",
          soft: "#eef2ff"
        }
      },
      boxShadow: {
        subtle: "0 1px 2px rgba(0,0,0,0.04), 0 1px 1px rgba(0,0,0,0.03)",
        panel: "0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)"
      },
      borderRadius: {
        md: "8px",
        lg: "10px",
        xl: "14px"
      },
      keyframes: {
        "fade-in": { from: { opacity: 0 }, to: { opacity: 1 } },
        "fade-up": { from: { opacity: 0, transform: "translateY(4px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        "toast-in": { from: { opacity: 0, transform: "translateY(6px) scale(0.98)" }, to: { opacity: 1, transform: "translateY(0) scale(1)" } }
      },
      animation: {
        "fade-in": "fade-in 150ms ease-out",
        "fade-up": "fade-up 180ms ease-out",
        "toast-in": "toast-in 160ms cubic-bezier(0.16, 1, 0.3, 1)"
      }
    }
  },
  plugins: []
};
