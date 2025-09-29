import { BandCode } from '../types';

// Theme-specific color palettes for optimal contrast
export const COLOR_ORDER = {
  light: [
    "#7A8D0F", // dev-1: darker lime
    "#16A32A", // dev-2: darker green
    "#29536B", // dev-3: navy
    "#2C7A7D", // dev-4: darker teal
    "#D99F3B", // dev-5: darker yellow
    "#D65A0F", // orange: darker
    "#B831CA", // magenta: darker
    "#1D4ED8", // blue
    "#0D9669", // emerald: darker
    "#DC2626", // red: darker
    "#0F8F8F", // teal: darker
    "#8B31D9", // violet: darker
  ],
  dark: [
    "#D1EC1C", // dev-1: brighter lime
    "#22E33D", // dev-2: brighter green
    "#3B7A99", // dev-3: lighter navy
    "#34B3BB", // dev-4: brighter teal
    "#FFD166", // dev-5: brighter yellow
    "#FF8A3D", // orange: brighter
    "#F161FF", // magenta: brighter
    "#3B82F6", // blue: brighter
    "#14DCA3", // emerald: brighter
    "#FF6B6B", // red: brighter
    "#16D6D6", // teal: brighter
    "#C77DFF", // violet: brighter
  ]
};

// Band codes and styles
export const BAND_LABEL: Record<BandCode, string> = {
  "24": "2.4GHz",
  "5": "5GHz",
  "5m": "5GHz mesh",
};

export const BAND_DASH: Record<BandCode, string | undefined> = {
  "24": undefined, // solid
  "5": "8 6",    // dashed
  "5m": "2 6",   // dotted-ish
};

// Chart specific styles
export const chartStyles = {
  container: {
    background: 'rgb(var(--surface-tile))',
    border: '1px solid var(--gradient-border)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'visible',
  },
  header: {
    padding: 'var(--d5)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--d3)',
  },
  title: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'rgb(var(--content-primary))',
  },
  filterButton: {
    height: 'var(--d8)',
    padding: '0 var(--d3)',
    borderRadius: 'var(--radius-lg)',
    background: 'rgb(var(--surface-action))',
    color: 'rgb(var(--content-primary))',
    border: '1px solid var(--gradient-border)',
    transition: 'background-color 0.2s ease-in-out',
    '&:hover': {
      background: 'rgb(var(--surface-action-hover))',
    },
  },
  tooltip: {
    background: 'rgb(var(--surface-overlay))',
    border: '1px solid var(--gradient-border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
    padding: 'var(--d4)',
  },
  legend: {
    item: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--d1)',
      padding: 'var(--d1) var(--d2)',
      borderRadius: 'var(--radius-sm)',
      transition: 'background-color 0.2s ease-in-out',
      '&:hover': {
        background: 'rgb(var(--surface-action-hover))',
      },
    },
    dot: {
      width: 'var(--d2)',
      height: 'var(--d2)',
      borderRadius: '50%',
    },
    text: {
      fontSize: 'var(--font-size-xs)',
      color: 'rgb(var(--content-secondary))',
    },
  },
  brush: {
    track: {
      height: 'var(--d12)',
      background: 'rgb(var(--surface-action))',
      borderRadius: 'var(--radius-lg)',
    },
    handle: {
      width: 'var(--d2)',
      background: 'rgb(var(--surface-accent-purple))',
      borderRadius: 'var(--radius-sm)',
      '&:hover': {
        background: 'rgb(var(--surface-accent-purple-hover))',
      },
    },
  },
};

// Reusable component styles
export const componentStyles = {
  button: {
    base: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: 'var(--d8)',
      padding: '0 var(--d3)',
      borderRadius: 'var(--radius-lg)',
      fontSize: 'var(--font-size-sm)',
      fontWeight: 'var(--font-weight-medium)',
      transition: 'all 0.2s ease-in-out',
    },
    primary: {
      background: 'rgb(var(--surface-accent-purple))',
      color: 'rgb(var(--neutral-0))',
      '&:hover': {
        background: 'rgb(var(--surface-accent-purple-hover))',
      },
    },
    secondary: {
      background: 'rgb(var(--surface-action))',
      color: 'rgb(var(--content-primary))',
      border: '1px solid var(--gradient-border)',
      '&:hover': {
        background: 'rgb(var(--surface-action-hover))',
      },
    },
  },
  input: {
    base: {
      height: 'var(--d8)',
      padding: '0 var(--d3)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--gradient-border)',
      background: 'rgb(var(--surface-action))',
      color: 'rgb(var(--content-primary))',
      fontSize: 'var(--font-size-sm)',
      '&:focus': {
        outline: 'none',
        borderColor: 'rgb(var(--surface-accent-purple))',
      },
    },
  },
};
