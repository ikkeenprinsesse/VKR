/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border:     "rgb(var(--border))",
        input:      "rgb(var(--input))",
        ring:       "rgb(var(--ring))",
        background: "rgb(var(--background))",
        foreground: "rgb(var(--foreground))",
        primary: {
          DEFAULT:    "rgb(var(--primary))",
          foreground: "rgb(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:    "rgb(var(--secondary))",
          foreground: "rgb(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT:    "rgb(var(--muted))",
          foreground: "rgb(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "rgb(var(--accent))",
          foreground: "rgb(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT:    "rgb(var(--destructive))",
          foreground: "rgb(var(--destructive-foreground))",
        },
        card: {
          DEFAULT:    "rgb(var(--card))",
          foreground: "rgb(var(--card-foreground))",
        },

        /* Duolingo-style palette */
        duo: {
          green:       "#58CC02",
          "green-dark": "#46A302",
          yellow:      "#FFC800",
          "yellow-dark": "#E6B400",
          red:         "#FF4B4B",
          "red-dark":  "#E03E3E",
          blue:        "#1CB0F6",
          "blue-dark": "#0A9FDA",
        },

        violet: {
          50:  "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
        },
        sidebar: {
          DEFAULT: "rgb(var(--sidebar-background))",
          border:  "rgb(var(--sidebar-border))",
        },
      },
      borderRadius: {
        "3xl": "1.5rem",
        "2xl": "1rem",
        xl:    "calc(var(--radius) + 4px)",
        lg:    "var(--radius)",
        md:    "calc(var(--radius) - 2px)",
        sm:    "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        xs:   "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        duo:  "0 4px 0 #d1d5db",
        "duo-violet": "0 4px 0 #6d28d9",
        "duo-green":  "0 4px 0 #46a302",
      },
      fontFamily: {
        sans: ["Nunito", "system-ui", "sans-serif"],
      },
      animation: {
        "duo-bounce": "duo-bounce 2s ease-in-out infinite",
        "flame-pulse": "flame-pulse 1.4s ease-in-out infinite",
        "duo-fade-up": "duo-fade-up 0.5s ease-out both",
        wiggle: "duo-wiggle 0.5s ease-in-out",
      },
    },
  },
  plugins: [],
};
