import type { Config } from "tailwindcss";
import tailwindAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        info: "hsl(var(--info))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Identidade Telun — o accent (antes ciano do Chronostek) reaponta para o
        // Lilás Elétrico; "navy" reaponta para o Cósmico. Assim todo o app é
        // re-skinado a partir daqui, sem hex espalhado pelos componentes.
        cyan: {
          300: "#CBB2FF",
          400: "#A56FFF",
          500: "#9260FF",
          600: "#8B5CF6",
        },
        navy: {
          900: "#12121F",
          950: "#0B0B12",
        },
        telun: {
          cosmico: "#0B0B12",
          violeta: "#3B1F6A",
          lilas: "#A56FFF",
          cobre: "#FF6A3D",
          dourado: "#FFD8A6",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        glow: "0 0 40px rgba(165, 111, 255, 0.14)",
      },
    },
  },
  plugins: [tailwindAnimate],
} satisfies Config;
