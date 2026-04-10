module.exports = {
  content: ['./app/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fcfdfd',
          100: '#f5f8fa',
          200: '#e5edeb',
          300: '#bed1cd',
          400: '#94b3ae',
          500: '#739591',
          600: '#5c7875',
          700: '#4b615f',
          800: '#3f504e',
          900: '#364342', // Soft pastel sage green
        },
        accent: {
          50: '#fffbf9',
          100: '#ffefe5',
          500: '#eeb295', // Soft pastel terracotta/peach
          600: '#d7977b',
        },
        manager: {
          50: '#f8f8fd',
          100: '#eff0ff',
          200: '#dbe0fd',
          600: '#8e96dc', // Soft lavender
          700: '#757ccb',
        },
        member: {
          50: '#f6fbfb',
          100: '#e8f6f6',
          200: '#cceae9',
          600: '#7bb9b9', // Pastel teal
          700: '#629e9e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 8px 30px rgba(135, 145, 160, 0.08)',
        glass: '0 4px 20px rgba(135, 145, 160, 0.04)',
        glow: '0 8px 24px rgba(115, 149, 145, 0.25)',
      },
    },
  },
  plugins: [],
};