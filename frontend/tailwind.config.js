/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#2563EB",
          50: "#EFF4FF",
          100: "#DBE6FE",
          200: "#BFD2FE",
          300: "#93B4FD",
          400: "#6090FA",
          500: "#2563EB",
          600: "#1D4ED8",
          700: "#1E40AF",
          800: "#1E3A8A",
          900: "#1E3A70",
        },
        surface: "#F8FAFC",
        sky: "#0EA5E9",
        success: {
          DEFAULT: "#16A34A",
          light: "#DCFCE7",
        },
        warning: {
          DEFAULT: "#EA580C",
          light: "#FFEDD5",
        },
        fraud: {
          DEFAULT: "#DC2626",
          light: "#FEE2E2",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(15, 23, 42, 0.05)",
        card: "0 1px 3px 0 rgba(15, 23, 42, 0.08), 0 1px 2px -1px rgba(15, 23, 42, 0.06)",
        "card-hover": "0 12px 28px -8px rgba(15, 23, 42, 0.16), 0 2px 8px -2px rgba(15, 23, 42, 0.08)",
        elevated: "0 4px 16px -2px rgba(15, 23, 42, 0.12)",
        popover: "0 16px 40px -8px rgba(15, 23, 42, 0.18), 0 4px 12px -4px rgba(15, 23, 42, 0.1)",
        "glow-primary": "0 0 0 3px rgba(37, 99, 235, 0.12)",
        "glow-fraud": "0 0 0 3px rgba(220, 38, 38, 0.12)",
        "inner-line": "inset 0 1px 0 0 rgba(255, 255, 255, 0.6)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        "slide-in": {
          "0%": { transform: "translateX(100%)", opacity: 0 },
          "100%": { transform: "translateX(0)", opacity: 1 },
        },
        "fade-in": {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
        "scale-in": {
          "0%": { opacity: 0, transform: "scale(0.96) translateY(4px)" },
          "100%": { opacity: 1, transform: "scale(1) translateY(0)" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(220, 38, 38, 0.4)" },
          "100%": { boxShadow: "0 0 0 8px rgba(220, 38, 38, 0)" },
        },
        "pulse-ring-soft": {
          "0%": { boxShadow: "0 0 0 0 rgba(37, 99, 235, 0.25)" },
          "100%": { boxShadow: "0 0 0 6px rgba(37, 99, 235, 0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        "draw-line": {
          "0%": { strokeDashoffset: 1000 },
          "100%": { strokeDashoffset: 0 },
        },
        rise: {
          "0%": { opacity: 0, transform: "translateY(6px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        "shrink-width": {
          "0%": { width: "100%" },
          "100%": { width: "0%" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(0deg)" },
          "25%": { transform: "rotate(-12deg)" },
          "75%": { transform: "rotate(12deg)" },
        },
      },
      animation: {
        "slide-in": "slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in": "fade-in 0.2s ease-out",
        "scale-in": "scale-in 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
        "pulse-ring": "pulse-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "pulse-ring-soft": "pulse-ring-soft 2.2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shimmer: "shimmer 1.8s ease-in-out infinite",
        rise: "rise 0.35s cubic-bezier(0.16, 1, 0.3, 1) both",
        "toast-life": "shrink-width 7s linear forwards",
      },
    },
  },
  plugins: [],
};
