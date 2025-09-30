# Multi-device latency chart prototype

This repository contains a prototype implementation of a multi-device latency visualization chart using Recharts. This is a **proof of concept** and requires additional optimization and hardening before production use.

## Overview

The prototype demonstrates:
- Multi-device latency visualization with band switching
- Interactive brush component for time range selection
- Theme-aware styling (light/dark modes)
- Data gap visualization with shaded regions
- Band-specific line styles (solid, dashed, dotted)
- Interactive device filtering

## ⚠️ Prototype limitations

### Performance considerations

1. **Brush component**
- Heavy DOM measurements during drag operations
- Synchronous calculations during brush interactions
- Multiple state updates during interactions
- Recommendation: Implement throttling and batched updates

3. **Data processing**
- Synchronous data transformations for band splitting
- Large datasets may cause rendering delays
- No data virtualization implemented
- Recommendation: Implement data windowing and virtualization

4. **Style system**
- Heavy reliance on CSS-in-JS calculations
- Theme changes trigger full re-renders
- Multiple duplicate style definitions
- Recommendation: Implement style caching and shared theme context

## CSS variable usage

The project uses a combination of Tailwind CSS and custom CSS variables. Key variable categories:

### Theme variables
```css
:root {
  /* Spacing */
  --d0: 0;
  --d1: 4px;
  /* ... through d64 */

  /* Colors */
  --neutral-0: 255 255 255;
  --neutral-50: 247 248 248;
  /* ... through neutral-1000 */

  /* Typography */
  --font-size-2xs: 0.625rem;
  --font-size-xs: 0.75rem;
  /* ... through font-size-2xl */

  /* Border Radius */
  --radius-2xs: 4px;
  --radius-xs: 6px;
  /* ... through radius-2xl */
}
```

### Theme-specific colors
```css
.main-light {
  --background: 0 0% 100%;
  --foreground: 224 71.4% 4.1%;
  /* ... other light theme variables */
}

.main-dark {
  --background: 224 71.4% 4.1%;
  --foreground: 210 20% 98%;
  /* ... other dark theme variables */
}
```

## Data format

The chart accepts data in two formats:

### CSV format
\`\`\`csv
timestamp,device_id,device_name,latency_ms,band
2025-08-13 00:00:00,dev-1,ARCADYAN SPEEDHOMEWLAN,7.0,2.4
\`\`\`

### TSV format
\`\`\`tsv
2025-08-13 00:00:00	dev-1	ARCADYAN SPEEDHOMEWLAN	7.0
\`\`\`

## Component architecture

The main components are:
- `MultiDeviceLatencyChart`: Main chart component
- `ExternalBrush`: Custom brush implementation
- `ThemeProvider`: Theme context provider
- `AnimatedThemeToggle`: Theme switcher

## Known issues

1. Memory leaks:
   - Resise observers may not be properly cleaned up
   - Event listeners might persist after component unmount

2. Performance issues:
   - Large datasets cause rendering delays
   - Multiple charts affect overall performance
   - Theme changes trigger unnecessary re-renders

3. Style issues:
   - Some styles are hardcoded and not theme-aware
   - CSS-in-JS performance impact
   - Duplicate style definitions

4. Multiple chart instances:
   - Current implementation creates separate resize observers for each chart
   - Each chart maintains its own state and event handlers
   - Multiple charts on the same page may cause performance degradation
   - Recommendation: Implement shared resources pattern for multiple chart instances

