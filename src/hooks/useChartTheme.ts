import { useMemo } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { COLOR_ORDER } from '../theme/constants';

export const useChartTheme = (deviceIds: string[]) => {
  const { theme } = useTheme();

  const deviceColors = useMemo(() => {
    const map: Record<string, string> = {};
    const palette = COLOR_ORDER[theme];
    deviceIds.forEach((id, idx) => {
      map[id] = palette[idx % palette.length];
    });
    return map;
  }, [deviceIds, theme]);

  const chartTheme = useMemo(() => ({
    axis: {
      stroke: 'rgb(var(--border-border-flat))',
      fontSize: 'var(--font-size-xs)',
      color: 'rgb(var(--content-tertiary))',
    },
    grid: {
      stroke: 'rgb(var(--border-border-flat))',
      strokeDasharray: '3 3',
    },
    tooltip: {
      background: 'rgb(var(--surface-overlay))',
      border: 'var(--gradient-border)',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
    },
    outage: {
      fill: 'rgb(var(--surface-tile))',
      stroke: 'rgb(var(--border-border-flat))',
      pattern: {
        stroke: 'rgb(var(--border-border-flat))',
        opacity: 0.7,
      },
    },
  }), [theme]);

  return {
    deviceColors,
    chartTheme,
  };
};
