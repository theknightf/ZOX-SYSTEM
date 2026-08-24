/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1rem',
    },
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        success: 'var(--success)',
        info: 'var(--info)',
        vip: 'var(--vip)',
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        sm: 'calc(var(--radius) - 0.25rem)',
        md: 'var(--radius)',
        lg: 'calc(var(--radius) + 0.25rem)',
        xl: 'calc(var(--radius) + 0.5rem)',
        '2xl': 'calc(var(--radius) + 1rem)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      fontWeight: {
        extrabold: '800',
        black: '900',
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
      backgroundImage: {
        'gradient-primary': 'var(--gradient-primary)',
        'gradient-accent': 'var(--gradient-accent)',
        'gradient-premium': 'var(--gradient-premium)',
        'text-shine': 'linear-gradient(110deg, var(--shine-a) 20%, #ffffff 50%, var(--shine-b) 80%)',
      },
      boxShadow: {
        'glow-primary': '0 0 24px -4px rgba(124, 58, 237, 0.45)',
        'glow-accent': '0 0 24px -4px rgba(78, 222, 163, 0.4)',
        'glow-warning': '0 0 24px -4px rgba(233, 196, 0, 0.35)',
        'glow-danger': '0 0 24px -4px rgba(255, 138, 128, 0.35)',
        'elevated': '0 8px 30px rgba(2, 8, 20, 0.35), 0 1px 0 rgba(255, 255, 255, 0.06) inset',
        'premium': '0 20px 60px -15px rgba(124, 58, 237, 0.25), 0 8px 24px rgba(2, 8, 20, 0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease forwards',
        'slide-in-right': 'slideInRight 0.25s ease forwards',
        'slide-up': 'slideUp 0.2s ease forwards',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'shimmer': 'shimmer 2.4s linear infinite',
        'sparkle': 'sparkle 1.6s ease-in-out infinite',
        'float': 'float 7s ease-in-out infinite',
        'aurora': 'aurora 16s ease-in-out infinite alternate',
        'gradient-x': 'gradientX 5s ease infinite',
        'pop-in': 'popIn 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        sparkle: {
          '0%, 100%': { opacity: '0', transform: 'scale(0.3) rotate(0deg)' },
          '50%': { opacity: '1', transform: 'scale(1) rotate(90deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        aurora: {
          '0%': { transform: 'translate(0, 0) scale(1)', opacity: '0.7' },
          '50%': { transform: 'translate(60px, -40px) scale(1.15)', opacity: '1' },
          '100%': { transform: 'translate(-40px, 30px) scale(0.95)', opacity: '0.6' },
        },
        gradientX: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        popIn: {
          from: { opacity: '0', transform: 'scale(0.92) translateY(8px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('tailwindcss-animate'),
    require('@tailwindcss/forms')({ strategy: 'class' }),
  ],
};
