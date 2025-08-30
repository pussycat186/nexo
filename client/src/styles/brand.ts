export const brand = {
  name: "NEXO",
  colors: {
    primary: "#2563EB",
    primaryHover: "#1E40AF",
    bg: { 
      light: "#FAFAFA", 
      dark: "#0B0F1A" 
    },
    card: { 
      light: "#FFFFFF", 
      dark: "rgba(255,255,255,0.04)" 
    },
    text: { 
      light: "#111827", 
      dark: "#E5E7EB" 
    },
    muted: "#9CA3AF",
    success: "#22C55E",
    warn: "#F59E0B",
    danger: "#EF4444",
    border: {
      light: "rgba(0,0,0,0.08)",
      dark: "rgba(255,255,255,0.08)"
    }
  },
  radii: {
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "20px",
    xxl: "24px",
    full: "9999px"
  },
  shadow: {
    card: "0 10px 30px rgba(0,0,0,0.15)",
    button: "0 2px 10px rgba(0,0,0,0.10)",
    dropdown: "0 4px 20px rgba(0,0,0,0.12)",
    modal: "0 20px 40px rgba(0,0,0,0.20)",
    glow: "0 0 20px rgba(37,99,235,0.3)"
  },
  typography: {
    fontFamily: {
      display: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      body: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      mono: "'JetBrains Mono', 'Fira Code', monospace"
    },
    weight: {
      light: 300,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    },
    size: {
      xs: "0.75rem",    // 12px
      sm: "0.875rem",   // 14px
      base: "1rem",     // 16px
      lg: "1.125rem",   // 18px
      xl: "1.25rem",    // 20px
      "2xl": "1.5rem",  // 24px
      "3xl": "2rem",    // 32px
      "4xl": "2.5rem"   // 40px
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75
    },
    tracking: {
      tight: "-0.02em",
      normal: "0",
      wide: "0.02em"
    }
  },
  spacing: {
    xs: "0.25rem",  // 4px
    sm: "0.5rem",   // 8px
    md: "1rem",     // 16px
    lg: "1.5rem",   // 24px
    xl: "2rem",     // 32px
    "2xl": "3rem",  // 48px
    "3xl": "4rem"   // 64px
  },
  animation: {
    duration: {
      instant: "50ms",
      fast: "150ms",
      normal: "200ms",
      slow: "300ms",
      slower: "500ms"
    },
    easing: {
      bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
      smooth: "cubic-bezier(0.4, 0.0, 0.2, 1)",
      premium: "cubic-bezier(0.2, 0.8, 0.2, 1)"
    }
  }
};