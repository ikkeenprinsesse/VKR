/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border:     "hsl(var(--border))",
        input:      "hsl(var(--input))",
        ring:       "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
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
          DEFAULT: "hsl(var(--sidebar-background))",
          border:  "hsl(var(--sidebar-border))",
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
