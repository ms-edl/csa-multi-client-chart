export type BandCode = "24" | "5" | "5m";

export interface Point {
  x: string;
  [key: string]: string | number;
}

export interface DeviceNames {
  [key: string]: string;
}

export interface ChartRange {
  left: number;
  right: number;
}

export interface OutageRange {
  x1: string;
  x2: string;
}

// Theme types
export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  [key: string]: string;
}

// Component specific types
export interface FilterState {
  selectedBands: Set<BandCode>;
  selectedClients: Set<string>;
}

export interface ChartConfig {
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
  minSelectionPoints?: number;
  maxSelectionPoints?: number;
  showDateRange?: boolean;
  enableZoom?: boolean;
}
