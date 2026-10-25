import type { Config } from 'tailwindcss';

// Shared by Tailwind utilities and server-rendered social images.
export const themeColors = {
  primary: '#234f41',
  'primary-strong': '#173f35',
  'primary-soft': '#edf1e8',
  'primary-muted': '#78937c',
  accent: '#9a7a46',
  'accent-light': '#e8ddc0',
  'accent-soft': '#f4efe2',
  foreground: '#163e36',
  muted: '#738071',
  subtle: '#8b9784',
  canvas: '#faf8f4',
  surface: '#ffffff',
  'surface-alt': '#f0f3e9',
  border: '#e3e6dc',
  'on-primary-muted': '#bdcec0',
  danger: '#b33c55',
  'danger-soft': '#fff0f3',
  success: '#326e62',
  'success-soft': '#edf8f2',
  warning: '#916524',
  'warning-soft': '#fff7e8',
};

export default {
  theme: {
    extend: {
      colors: themeColors,
      fontFamily: { display: ['Georgia', 'Times New Roman', 'serif'] },
      boxShadow: {
        card: '0 6px 30px rgb(23 63 53 / 5%)',
        float: '0 18px 60px rgb(23 63 53 / 10%)',
      },
    },
  },
} satisfies Config;
