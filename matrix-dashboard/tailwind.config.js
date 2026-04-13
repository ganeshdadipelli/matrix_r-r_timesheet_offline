/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Cinematic Atmospheric Palette — "Misty Landscape"
        matrix: {
          dark:    '#1F2A2E',   // Dark Forest / main bg
          deeper:  '#161E22',   // Even darker bg / sidebar
          surface: '#263035',   // Card surfaces
          border:  '#2E3D44',   // Subtle borders
          slate:   '#5F6F7D',   // Dusty Blue / primary accent
          mist:    '#7C8A96',   // Muted Grey-Blue
          fog:     '#6E7F8B',   // Faded Blue-Grey
          cloud:   '#A3ADB5',   // Light Blue-Grey / muted text
          peach:   '#D6A38A',   // Soft Peach / warm accent
          cream:   '#EDEAE6',   // Beige Off-white / primary text
          glow:    '#B8C5CE',   // Highlight
        },
        // Keep primary for backwards compat with any missed references
        primary: {
          50:  '#f0f4f6',
          100: '#dce5ea',
          200: '#b8ccd5',
          300: '#8aaebb',
          400: '#7C8A96',
          500: '#5F6F7D',
          600: '#4e5d6a',
          700: '#3d4b56',
          800: '#2c3a42',
          900: '#1F2A2E',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      backgroundImage: {
        'matrix-gradient':   'linear-gradient(135deg, #1F2A2E 0%, #263035 50%, #1A2428 100%)',
        'matrix-radial':     'radial-gradient(ellipse at 60% 40%, #5F6F7D22 0%, transparent 60%)',
        'peach-gradient':    'linear-gradient(135deg, #D6A38A 0%, #c4927a 100%)',
        'slate-gradient':    'linear-gradient(135deg, #5F6F7D 0%, #4e5d6a 100%)',
        'glass-gradient':    'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
        'horizon-gradient':  'linear-gradient(180deg, #6E7F8B 0%, #A3ADB5 40%, #D6A38A 75%, #1F2A2E 100%)',
      },
      boxShadow: {
        'matrix-sm':  '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
        'matrix':     '0 4px 16px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.2)',
        'matrix-lg':  '0 10px 40px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.3)',
        'matrix-xl':  '0 20px 60px rgba(0,0,0,0.6), 0 8px 20px rgba(0,0,0,0.4)',
        'glow-slate': '0 0 20px rgba(95,111,125,0.3)',
        'glow-peach': '0 0 20px rgba(214,163,138,0.3)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.08)',
      },
      animation: {
        'ambient-float':    'ambientFloat 8s ease-in-out infinite',
        'ambient-float-2':  'ambientFloat 11s ease-in-out infinite reverse',
        'ambient-float-3':  'ambientFloat 14s ease-in-out infinite 3s',
        'fade-in':          'fadeIn 0.6s ease-out forwards',
        'fade-in-up':       'fadeInUp 0.7s ease-out forwards',
        'slide-in-left':    'slideInLeft 0.5s ease-out forwards',
        'slide-in-right':   'slideInRight 0.5s ease-out forwards',
        'scale-in':         'scaleIn 0.4s ease-out forwards',
        'shimmer':          'shimmer 2s linear infinite',
        'pulse-soft':       'pulseSoft 3s ease-in-out infinite',
        'count-up':         'countUp 1s ease-out forwards',
        'morph-logo':       'morphLogo 4s ease-in-out infinite',
        'gradient-shift':   'gradientShift 6s ease-in-out infinite',
        'text-reveal':      'textReveal 0.8s cubic-bezier(0.16,1,0.3,1) forwards',
        'spin-slow':        'spin 8s linear infinite',
      },
      keyframes: {
        ambientFloat: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)',     opacity: '0.4' },
          '33%':       { transform: 'translate(30px, -20px) scale(1.05)', opacity: '0.6' },
          '66%':       { transform: 'translate(-20px, 15px) scale(0.97)', opacity: '0.5' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          from: { opacity: '0', transform: 'translateX(-20px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.6' },
          '50%':      { opacity: '1'   },
        },
        morphLogo: {
          '0%, 100%': { borderRadius: '28% 72% 70% 30% / 30% 30% 70% 70%' },
          '25%':      { borderRadius: '58% 42% 28% 72% / 52% 68% 32% 48%' },
          '50%':      { borderRadius: '40% 60% 60% 40% / 60% 30% 70% 40%' },
          '75%':      { borderRadius: '68% 32% 42% 58% / 38% 62% 38% 62%' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%'   },
          '50%':      { backgroundPosition: '100% 50%' },
        },
        textReveal: {
          from: { opacity: '0', transform: 'translateY(8px)', filter: 'blur(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)',   filter: 'blur(0)'   },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
