/** @type {import('tailwindcss').Config} */

/**
 * Design tokens are declared once as CSS custom properties in `src/index.css`
 * and surfaced to Tailwind here. Nothing in this file hardcodes a hex value —
 * changing a token in one place changes the whole console.
 *
 * NOTE on the `primary` / `secondary` naming: this app uses `bg-primary` to mean
 * "page background" and `text-primary` to mean "highest-contrast text". Those are
 * two different values behind one word, so they are mapped per-utility
 * (backgroundColor vs textColor) rather than through a shared `colors` key.
 */
module.exports = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // Type scale nudged up from Tailwind's defaults. A console gets read at
      // arm's length on a large monitor, and the stock 12px/14px steps were
      // too tight to scan quickly. Spacing is left alone so density holds.
      fontSize: {
        xs: ['13px', { lineHeight: '1.45' }],
        sm: ['14.5px', { lineHeight: '1.5' }],
        base: ['16px', { lineHeight: '1.55' }],
        lg: ['18px', { lineHeight: '1.5' }],
        xl: ['20px', { lineHeight: '1.4' }],
        '2xl': ['25px', { lineHeight: '1.3' }],
        '3xl': ['31px', { lineHeight: '1.2' }],
      },

      fontFamily: {
        sans: ['Geist Variable', 'Geist', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Geist Mono Variable', 'Geist Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },

      // Signal palette — the only chroma allowed in the UI.
      // red = critical/investigating/error · amber = high/identified/degraded
      // blue = medium/monitoring/info    · emerald = low/resolved/connected
      colors: {
        signal: {
          critical: 'var(--signal-critical)',
          high: 'var(--signal-high)',
          medium: 'var(--signal-medium)',
          low: 'var(--signal-low)',
        },
        line: {
          DEFAULT: 'var(--line)',
          strong: 'var(--line-strong)',
        },
      },

      backgroundColor: ({ theme }) => ({
        ...theme('colors'),
        primary: 'var(--bg-base)',
        secondary: 'var(--bg-surface)',
        tertiary: 'var(--bg-raised)',
        hover: 'var(--bg-overlay)',
        accent: 'var(--accent)',
        'accent-primary': 'var(--accent)',
        'accent-secondary': 'var(--accent-dim)',
        'border-primary': 'var(--line)',
      }),

      textColor: ({ theme }) => ({
        ...theme('colors'),
        primary: 'var(--text-hi)',
        secondary: 'var(--text-mid)',
        muted: 'var(--text-lo)',
        accent: 'var(--accent)',
        'accent-primary': 'var(--accent)',
        'accent-secondary': 'var(--accent-dim)',
        'on-accent': 'var(--accent-on)',
      }),

      borderColor: ({ theme }) => ({
        ...theme('colors'),
        // Components across the app write `className="border"` and expect a
        // visible hairline, so the default border color is a real token.
        DEFAULT: 'var(--line)',
        primary: 'var(--line)',
        secondary: 'var(--line-strong)',
        accent: 'var(--accent)',
      }),

      ringColor: ({ theme }) => ({
        ...theme('colors'),
        DEFAULT: 'var(--focus-ring)',
        accent: 'var(--accent)',
      }),

      borderRadius: {
        // One radius scale, used everywhere. Containers step up, controls step down.
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '10px',
        xl: '14px',
        '2xl': '18px',
      },

      // Shadows are tinted to the background hue, never pure black.
      boxShadow: {
        hairline: '0 0 0 1px var(--line)',
        raised: '0 1px 2px rgba(4, 6, 9, 0.5), 0 4px 12px -4px rgba(4, 6, 9, 0.6)',
        float: '0 12px 32px -8px rgba(4, 6, 9, 0.75), 0 2px 8px rgba(4, 6, 9, 0.5)',
        overlay: '0 24px 64px -12px rgba(4, 6, 9, 0.85), 0 0 0 1px var(--line-strong)',
      },

      transitionTimingFunction: {
        // No `linear` / `ease-in-out` defaults — motion carries weight.
        swift: 'cubic-bezier(0.32, 0.72, 0, 1)',
        exit: 'cubic-bezier(0.4, 0, 1, 1)',
      },

      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        breathe: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.45', transform: 'scale(0.88)' },
        },
      },

      animation: {
        'fade-up': 'fade-up 320ms cubic-bezier(0.32, 0.72, 0, 1) both',
        shimmer: 'shimmer 1.6s cubic-bezier(0.32, 0.72, 0, 1) infinite',
        breathe: 'breathe 2.4s cubic-bezier(0.32, 0.72, 0, 1) infinite',
      },
    },
  },
  plugins: [],
}
