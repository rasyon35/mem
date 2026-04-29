/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Background colors
        'bg': {
          '900': 'var(--bg-900)',
          '800': 'var(--bg-800)',
          '700': 'var(--bg-700)',
          '600': 'var(--bg-600)',
          '500': 'var(--bg-500)',
          '950': 'var(--bg-950)',
        },
        // Text colors
        'text': {
          'primary': 'var(--text-primary)',
          'secondary': 'var(--text-secondary)',
          'muted': 'var(--text-muted)',
          'dim': 'var(--text-dim)',
        },
        // Accent colors
        'accent': {
          DEFAULT: 'var(--accent)',
          'light': 'var(--accent-light)',
          'dark': 'var(--accent-dark)',
        },
        // Status colors
        'success': 'var(--success)',
        'warning': 'var(--warning)',
        'error': 'var(--danger)',
        'danger': 'var(--danger)',
        'info': 'var(--info)',
        // Surface colors
        'surface': {
          '1': 'var(--surface-1)',
          '2': 'var(--surface-2)',
          '3': 'var(--surface-3)',
        },
        // Border colors
        'border': {
          'subtle': 'var(--border-subtle)',
          'strong': 'var(--border-strong)',
          DEFAULT: 'var(--border)',
        },
      },
      backgroundColor: {
        'success': 'var(--info-bg)',
        'success-bg': 'var(--green-bg)',
        'warning-bg': 'var(--yellow-bg)',
        'error-bg': 'var(--red-bg)',
        'danger-bg': 'var(--red-bg)',
        'info-bg': 'var(--info-bg)',
        'glass': 'var(--glass-bg)',
        'glass-heavy': 'var(--glass-heavy-bg)',
      },
      borderColor: {
        'accent': 'var(--border-accent)',
        'subtle': 'var(--border-subtle)',
        'strong': 'var(--border-strong)',
      },
      boxShadow: {
        '1': 'var(--shadow-1)',
        '2': 'var(--shadow-2)',
        '3': 'var(--shadow-3)',
        'lg': 'var(--shadow-lg)',
        'inset': 'var(--shadow-inset)',
      },
      spacing: {
        '1': 'var(--space-1)',
        '2': 'var(--space-2)',
        '3': 'var(--space-3)',
        '4': 'var(--space-4)',
        '5': 'var(--space-5)',
        '6': 'var(--space-6)',
        '7': 'var(--space-7)',
        '8': 'var(--space-8)',
        '9': 'var(--space-9)',
        '10': 'var(--space-10)',
      },
      fontSize: {
        'base': 'var(--text-base)',
        'heading-1': 'var(--heading-1)',
        'heading-2': 'var(--heading-2)',
      },
      lineHeight: {
        'base': 'var(--leading-base)',
      },
      fontFamily: {
        'sans': 'var(--font-sans)',
        'display': 'var(--font-display)',
      },
      backdropBlur: {
        'glass': 'var(--glass-blur)',
      },
      borderRadius: {
        'sm': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in': 'slideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'modal-in': 'modalIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        modalIn: {
          '0%': { opacity: '0', transform: 'translateY(20px) scale(0.95)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.5' },
        },
      },
    },
  },
  plugins: [],
};
