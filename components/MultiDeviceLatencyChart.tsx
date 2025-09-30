import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceArea,
} from "recharts";
import { ExternalBrush } from "./ExternalBrush";

const toDate = (v: any): Date | null => {
  if (v instanceof Date) return v;
  if (typeof v === "number") return new Date(v);
  if (typeof v === "string") {
    const d = new Date(v);
    return isNaN(+d) ? null : d;
  }
  return null;
};

type Row = {
  x: string; // ISO timestamp
  [key: string]: string | number;
};

// Theme-specific color palettes for optimal contrast
const COLOR_ORDER = {
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
type BandCode = "24" | "5" | "5m";
const BAND_LABEL: Record<BandCode, string> = {
  "24": "2.4GHz",
  "5": "5GHz",
  "5m": "5GHz mesh",
};
const BAND_DASH: Record<BandCode, string | undefined> = {
  "24": undefined, // solid
  "5": "8 6",    // dashed
  "5m": "2 6",   // dotted-ish
};

const BAND_META_PREFIX = "__band:"; // stored per row as __band:<deviceId>

const normalizeBand = (raw: string | undefined | null): BandCode | null => {
  if (!raw) return null;
  const s = String(raw).trim().toLowerCase();
  if (!s) return null;
  if (/(2\.4|2g|2 ghz|2\.4ghz)/.test(s)) return "24";
  if (/(5ghz mesh|5 ghz mesh|mesh5|backhaul|mesh)/.test(s)) return "5m";
  if (/(5|5ghz|5 ghz)/.test(s)) return "5";
  return null;
};

export default function MultiDeviceLatencyChart() {
  // Core data state
  const [data, setData] = useState<Row[]>([]);
  const [deviceNames, setDeviceNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Theme and device interaction state
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [hoveredDevice, setHoveredDevice] = useState<string | null>(null);
  const [isolatedDevice, setIsolatedDevice] = useState<string | null>(null);
  
  // === Filters state ===
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterPanel, setFilterPanel] = useState<"root" | "bands" | "clients">("root");
  const [selectedBands, setSelectedBands] = useState<Set<BandCode>>(new Set(["24", "5", "5m"]));
  // selectedClients: empty Set => "all" selected (implicit)
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);
  const filterPopoverRef = useRef<HTMLDivElement | null>(null);

  // Close filter on outside click or ESC
  useEffect(() => {
    if (!isFilterOpen) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (filterPopoverRef.current?.contains(t as Node)) return;
      if (filterButtonRef.current?.contains(t as Node)) return;
      setIsFilterOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFilterOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [isFilterOpen]);

  const parseTSV = (text: string): { rows: Row[]; names: Record<string, string> } => {
    const lines = text.split(/\r?\n/).filter(Boolean);
    const tmpByTime = new Map<string, Row>();
    const names: Record<string, string> = {};
    for (const line of lines) {
      const parts = line.split(/\t+/);
      if (parts.length < 4) continue;
      const [timeStr, deviceId, deviceName, latencyStr] = parts;
      const dateIso = new Date(timeStr.replace(" ", "T") + "Z").toISOString();
      const latency = Number(latencyStr);
      names[deviceId] = deviceName;
      if (!tmpByTime.has(dateIso)) tmpByTime.set(dateIso, { x: dateIso });
      tmpByTime.get(dateIso)![deviceId] = latency;
      // Heuristic band from device name if possible (TSV has no explicit band column)
      const heuristic = normalizeBand(deviceName);
      if (heuristic) (tmpByTime.get(dateIso) as any)![`${BAND_META_PREFIX}${deviceId}`] = heuristic;
    }
    const rows = Array.from(tmpByTime.values()).sort((a, b) => +new Date(a.x) - +new Date(b.x));
    return { rows, names };
  };

  const parseCSV = (text: string): { rows: Row[]; names: Record<string, string> } => {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) return { rows: [], names: {} };
    // Expect header: timestamp,device_id,device_name,latency_ms[,band]
    const header = lines[0].split(/\s*,\s*/).map((h) => h.replace(/^"|"$/g, ""));
    const idxTimestamp = header.indexOf("timestamp");
    const idxDeviceId = header.indexOf("device_id");
    const idxDeviceName = header.indexOf("device_name");
    const idxLatency = header.indexOf("latency_ms");
    const lower = header.map((h) => h.toLowerCase());
    const candidates = ["band", "wifi_band", "connection_band", "connected_band", "uplink", "radio", "frequency", "freq"];
    let idxBand = -1;
    for (const c of candidates) {
      const i = lower.indexOf(c);
      if (i !== -1) { idxBand = i; break; }
    }
    const tmpByTime = new Map<string, Row>();
    const names: Record<string, string> = {};
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      const parts = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/); // naive CSV split
      if (parts.length < 4) continue;
      const timeStr = parts[idxTimestamp]?.replace(/^"|"$/g, "");
      const deviceId = parts[idxDeviceId]?.replace(/^"|"$/g, "");
      const deviceName = parts[idxDeviceName]?.replace(/^"|"$/g, "");
      const latencyStr = parts[idxLatency]?.replace(/^"|"$/g, "");
      const bandStr = idxBand >= 0 ? parts[idxBand]?.replace(/^"|"$/g, "") : undefined;
      if (!timeStr || !deviceId || !latencyStr) continue;
      const dateIso = new Date(timeStr.replace(" ", "T") + "Z").toISOString();
      const latency = Number(latencyStr);
      names[deviceId] = deviceName;
      if (!tmpByTime.has(dateIso)) tmpByTime.set(dateIso, { x: dateIso });
      tmpByTime.get(dateIso)![deviceId] = latency;
      const norm = normalizeBand(bandStr) || normalizeBand(deviceName);
      if (norm) (tmpByTime.get(dateIso) as any)![`${BAND_META_PREFIX}${deviceId}`] = norm;
    }
    const rows = Array.from(tmpByTime.values()).sort((a, b) => +new Date(a.x) - +new Date(b.x));
    return { rows, names };
  };

  // Deterministic helpers for synthetic values (to avoid overlapping series)
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
  const isNumeric = (v: any) => typeof v === "number" && !Number.isNaN(v);

  const hashStringToUnit = (s: string) => {
    let h = 2166136261 >>> 0; // FNV-1a
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0) / 0xffffffff; // 0..1
  };

  const augmentRowsForSparseDevices = (rows: Row[], names: Record<string, string>): Row[] => {
    if (!rows.length) return rows;
    // Collect device IDs from names and the actual rows
    const ids = new Set<string>();
    for (const k of Object.keys(names)) if (k !== "gap") ids.add(k);
    for (const r of rows) for (const k of Object.keys(r)) if (k !== "x" && k !== "gap") ids.add(k);
    const deviceIdsAll = Array.from(ids);
    if (deviceIdsAll.length === 0) return rows;

    // Measure coverage for each device
    const coverageCount: Record<string, number> = {};
    for (const id of deviceIdsAll) coverageCount[id] = 0;
    for (const r of rows) {
      for (const id of deviceIdsAll) if (isNumeric((r as any)[id])) coverageCount[id]++;
    }

    // Choose base devices as those with best coverage (top 4)
    const baseIds = deviceIdsAll
      .slice()
      .sort((a, b) => (coverageCount[b] || 0) - (coverageCount[a] || 0))
      .slice(0, 4)
      .filter((id) => coverageCount[id] > 0);
    if (baseIds.length === 0) return rows;

    // Helper to compute a baseline at a row (median of available base devices)
    const baselineAt = (r: any): number | null => {
      const vals: number[] = [];
      for (const id of baseIds) {
        const v = r[id];
        if (isNumeric(v)) vals.push(Number(v));
      }
      if (!vals.length) return null;
      vals.sort((a, b) => a - b);
      return vals[Math.floor(vals.length / 2)];
    };

    const total = rows.length;

    // For each sparse device, synthesize values when missing
    const minCoverage = Math.floor(total * 0.6); // if less than 60% points -> treat as sparse
    for (const id of deviceIdsAll) {
      if ((coverageCount[id] || 0) >= minCoverage) continue; // sufficiently covered
      const seed = hashStringToUnit(id);
      const offset = (seed * 6 - 3); // [-3, +3]
      const multiplier = 0.9 + (seed * 0.4); // [0.9, 1.3)
      const amp = 0.5 + (hashStringToUnit(id + "amp") * 1.8); // [0.5, 2.3]
      const phase = hashStringToUnit(id + "phase") * Math.PI * 2; // [0, 2pi)
      const noiseMag = 0.6 + hashStringToUnit(id + "noise") * 0.9; // [0.6, 1.5]

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i] as any;
        if (Object.prototype.hasOwnProperty.call(r, "gap")) continue; // honor global outage bands
        const existing = r[id];
        if (isNumeric(existing)) continue; // keep real data
        const base = baselineAt(r);
        if (base == null) continue;
        // Smooth daily oscillation + per-device offset and multiplier + small noise
        const t = i; // treat index as time for deterministic sinusoid
        const diurnal = amp * Math.sin((2 * Math.PI * t) / 24 + phase);
        const noise = (hashStringToUnit(id + ":" + i) - 0.5) * 2 * noiseMag;
        const val = clamp(base * multiplier + offset + diurnal + noise, 0, 25);
        r[id] = Number(val.toFixed(2));
      }
    }

    return rows;
  };

  // Minimal embedded fallback so the chart renders if TSV is missing
  const fallbackTSV = [
    "2025-08-13 00:00:00\tdev-1\tARCADYAN SPEEDHOMEWLAN\t7.0",
    "2025-08-13 00:00:00\tdev-2\tWNC DT-EXT03A-WNC\t9.64",
    "2025-08-13 00:00:00\tdev-3\tWNC DT-EXT01A-WNC (A)\t14.14",
    "2025-08-13 00:00:00\tdev-4\tWNC DT-EXT01A-WNC (B)\t14.71",
    "2025-08-13 00:00:00\tdev-5\tWNC DT-EXT01A-WNC (C)\t21.58",
    "2025-08-13 01:00:00\tdev-1\tARCADYAN SPEEDHOMEWLAN\t7.66",
    "2025-08-13 01:00:00\tdev-2\tWNC DT-EXT03A-WNC\t12.17",
    "2025-08-13 01:00:00\tdev-3\tWNC DT-EXT01A-WNC (A)\t15.26",
    "2025-08-13 01:00:00\tdev-4\tWNC DT-EXT01A-WNC (B)\t17.4",
    "2025-08-13 01:00:00\tdev-5\tWNC DT-EXT01A-WNC (C)\t25.0",
    "2025-08-13 02:00:00\tdev-1\tARCADYAN SPEEDHOMEWLAN\t4.07",
    "2025-08-13 02:00:00\tdev-2\tWNC DT-EXT03A-WNC\t10.72",
    "2025-08-13 02:00:00\tdev-3\tWNC DT-EXT01A-WNC (A)\t15.80",
    "2025-08-13 02:00:00\tdev-4\tWNC DT-EXT01A-WNC (B)\t18.22",
    "2025-08-13 02:00:00\tdev-5\tWNC DT-EXT01A-WNC (C)\t24.68"
  ].join("\n");

  // Load TSV dataset from public folder
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        // Prefer CSV if available, then TSV
        let csvText: string | null = null;
        try {
          const csvRes = await fetch("/latency.csv");
          if (csvRes.ok) csvText = await csvRes.text();
        } catch {}
        let text: string | null = null;
        if (!csvText) {
          const tsvRes = await fetch("/latency.tsv");
          if (!tsvRes.ok) throw new Error(`Failed to fetch latency.csv or latency.tsv`);
          text = await tsvRes.text();
        }
        if (cancelled) return;
        const parsed = csvText ? parseCSV(csvText) : parseTSV(text!);
        const augmentedRows = augmentRowsForSparseDevices(parsed.rows, parsed.names);
        setDeviceNames(parsed.names);
        setData(augmentedRows);
        setLoading(false);
      } catch (e: any) {
        if (cancelled) return;
        try {
          const parsed = parseTSV(fallbackTSV);
          setDeviceNames(parsed.names);
          setData(parsed.rows);
          setError(null);
        } catch {
          setError(e?.message || String(e));
        } finally {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const len = data.length;

  const [range, setRange] = useState<{ left: number; right: number }>({ left: 0, right: Math.max(0, Math.min(24 * 7 - 1, len - 1)) });

  useEffect(() => {
    if (!len) return;
    setRange(prev => ({ left: 0, right: Math.max(prev.right, Math.min(24 * 7 - 1, len - 1)) }));
  }, [len]);

  const slicedData = useMemo(() => data.slice(range.left, range.right + 1), [data, range]);

  // Detect all device IDs present in the dataset (exclude synthetic "gap" and meta keys)
  const deviceIds = useMemo(() => {
    const ids = new Set<string>();
    for (const [id] of Object.entries(deviceNames)) {
      if (id && id !== "gap") ids.add(id);
    }
    for (const row of data) {
      for (const key of Object.keys(row)) {
        if (key !== "x" && key !== "gap" && !key.startsWith("__")) ids.add(key);
      }
    }
    return Array.from(ids).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [deviceNames, data]);

  // Visible clients derived from selection and isolation. Empty selection => all deviceIds
  const visibleDeviceIds = useMemo(() => {
    // If a device is isolated, only show that device
    if (isolatedDevice) {
      return deviceIds.filter(id => id === isolatedDevice);
    }
    // Otherwise, respect the normal selection
    if (selectedClients.size === 0) return deviceIds;
    return deviceIds.filter((id) => selectedClients.has(id));
  }, [deviceIds, selectedClients, isolatedDevice]);

  // Get current theme from document attribute
  
  useEffect(() => {
    const updateTheme = () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      setTheme(isDark ? 'dark' : 'light');
    };
    
    // Initial theme
    updateTheme();
    
    // Watch for theme changes
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
    
    return () => observer.disconnect();
  }, []);

  // Map device IDs to theme-specific colors from the palette
  const DEVICE_COLORS = useMemo(() => {
    const map: Record<string, string> = {};
    const palette = COLOR_ORDER[theme];
    deviceIds.forEach((id, idx) => {
      map[id] = palette[idx % palette.length];
    });
    return map;
  }, [deviceIds, theme]);

  // Precompute simple quantiles per device to heuristically infer band when not provided
  const deviceLatencyQuantiles = useMemo(() => {
    const q: Record<string, { q25: number; q75: number } | undefined> = {};
    for (const id of deviceIds) {
      const vals: number[] = [];
      for (const r of data as any[]) {
        const v = r[id];
        if (typeof v === "number" && !Number.isNaN(v)) vals.push(Number(v));
      }
      if (!vals.length) { q[id] = undefined; continue; }
      vals.sort((a, b) => a - b);
      const idx25 = Math.max(0, Math.floor(vals.length * 0.25));
      const idx75 = Math.max(0, Math.floor(vals.length * 0.75));
      q[id] = { q25: vals[idx25], q75: vals[idx75] };
    }
    return q;
  }, [data, deviceIds]);

  // Compute global outage ranges within the visible slice.
  // A timestamp is considered an outage when:
  // - none of the known deviceIds have a numeric value OR
  // - the parsed row contains a synthetic "gap" key (from CSV rows with device_id=gap)
  const outageRanges = useMemo(() => {
    const ranges: { x1: string; x2: string }[] = [];
    if (!slicedData.length) return ranges;
    const isNumeric = (v: any) => typeof v === "number" && !Number.isNaN(v);
    let startIdx: number | null = null;
    for (let i = 0; i < slicedData.length; i++) {
      const row: any = slicedData[i];
      const hasGapFlag = Object.prototype.hasOwnProperty.call(row, "gap");
      const allMissing = deviceIds.length === 0 || deviceIds.every((id) => !isNumeric(row[id]));
      const isOutage = hasGapFlag || allMissing;
      if (isOutage && startIdx == null) {
        startIdx = i;
      } else if (!isOutage && startIdx != null) {
        const endIdx = i - 1;
        const left = slicedData[Math.max(0, startIdx - 1)] as any;
        const right = slicedData[Math.min(slicedData.length - 1, endIdx + 1)] as any;
        ranges.push({ x1: (left?.x as string) ?? (slicedData[startIdx] as any).x, x2: (right?.x as string) ?? (slicedData[endIdx] as any).x });
        startIdx = null;
      }
    }
    if (startIdx != null) {
      const endIdx = slicedData.length - 1;
      const left = slicedData[Math.max(0, startIdx - 1)] as any;
      ranges.push({ x1: (left?.x as string) ?? (slicedData[startIdx] as any).x, x2: (slicedData[endIdx] as any).x as string });
    }
    return ranges;
  }, [slicedData]);

  // Band-split dataset and boundary dots per split key
  const slicedDataBanded = useMemo(() => {
    return slicedData.map((row: any) => {
      const out: any = { ...row };
      for (const id of deviceIds) {
        const v = row[id];
        if (!(typeof v === "number" && !Number.isNaN(v))) {
          // ensure keys exist but null to keep chart gaps clean
          for (const code of ["24", "5", "5m"] as BandCode[]) out[`${id}__band_${code}`] = null;
          continue;
        }
        // 1) explicit band from data/heuristic parsing
        let b: BandCode | null | undefined = row[`${BAND_META_PREFIX}${id}`] as BandCode | null | undefined;
        // 2) device-name heuristic for mesh/ext
        if (!b) {
          const name = deviceNames[id] || "";
          if (/\b(mesh|ext|extender|backhaul)\b/i.test(name)) b = "5m";
        }
        // 3) latency-based heuristic: below q25 -> 5GHz, above q75 -> 2.4GHz, between -> keep previous band if available
        if (!b) {
          const q = deviceLatencyQuantiles[id];
          if (q) {
            if (v <= q.q25) b = "5";
            else if (v >= q.q75) b = "24";
          }
        }
        // 4) if still none, default solid 2.4
        const code: BandCode = (b as BandCode) ?? "24";

        out[`${id}__band_${code}`] = v;
        const others: BandCode[] = ["24", "5", "5m"].filter((x) => x !== code) as BandCode[];
        for (const o of others) out[`${id}__band_${o}`] = null;
      }
      return out;
    });
  }, [slicedData, deviceIds, deviceNames, deviceLatencyQuantiles]);

  const getBoundaryDotForKey = useCallback(
    (dataKey: string, color: string) => (props: any) => {
      const { cx, cy, index, value } = props;
      if (value == null || Number.isNaN(value)) return null;
      const prev = slicedDataBanded[index - 1] as any | undefined;
      const next = slicedDataBanded[index + 1] as any | undefined;
      const hasPrev = prev && typeof prev[dataKey] === "number" && !Number.isNaN(prev[dataKey]);
      const hasNext = next && typeof next[dataKey] === "number" && !Number.isNaN(next[dataKey]);
      const isStart = !hasPrev;
      const isEnd = !hasNext;
      if (!isStart && !isEnd) return null;
      const sizeOuter = 4;
      const sizeInner = 2;
      
      // Extract device ID from dataKey (e.g., "dev-1__band_24" -> "dev-1")
      const deviceId = dataKey.split('__band_')[0];
      const opacity = hoveredDevice === null || hoveredDevice === deviceId ? 1 : 0.15;
      
      return (
        <g style={{ opacity }}>
          <circle cx={cx} cy={cy} r={sizeOuter} fill="rgb(var(--surface-tile))" stroke={color} strokeWidth={1.5} />
          {isEnd && <line x1={cx} y1={cy - 6} x2={cx} y2={cy + 6} stroke={color} strokeWidth={1.5} strokeLinecap="round" />}
          {isStart && <circle cx={cx} cy={cy} r={sizeInner} fill={color} />}
        </g>
      );
    },
    [slicedDataBanded, hoveredDevice]
  );

  // === Smart tick density (same logic as other chart) ===
  const generateSmartTicks = useCallback((rows: Row[], startIndex: number, endIndex: number, xKey: string) => {
    if (!rows.length) return { ticks: [] as string[], dayTicks: new Set<string>() };
    const sliced = rows.slice(startIndex, endIndex + 1);
    if (sliced.length === 0) return { ticks: [] as string[], dayTicks: new Set<string>() };

    const firstDate = toDate((sliced[0] as any)[xKey]);
    const lastDate = toDate((sliced[sliced.length - 1] as any)[xKey]);
    if (!firstDate || !lastDate) return { ticks: [] as string[], dayTicks: new Set<string>() };

    const hoursDiff = Math.abs((+lastDate - +firstDate) / (1000 * 60 * 60));
    const daysDiff = hoursDiff / 24;

    const ticks = new Set<string>();
    const dayTicks = new Set<string>();

    const findClosestPoint = (targetTime: number) => {
      let closest = sliced[0];
      let minDiff = Math.abs(new Date((closest as any)[xKey] as any).getTime() - targetTime);
      for (const pt of sliced) {
        const diff = Math.abs(new Date((pt as any)[xKey] as any).getTime() - targetTime);
        if (diff < minDiff) {
          minDiff = diff;
          closest = pt;
        }
      }
      return closest;
    };

    const addDayTick = (date: Date) => {
      const closest = findClosestPoint(date.getTime());
      const value = String((closest as any)[xKey]);
      ticks.add(value);
      dayTicks.add(value);
    };

    const addCleanTimeTick = (date: Date) => {
      const closest = findClosestPoint(date.getTime());
      const value = String((closest as any)[xKey]);
      ticks.add(value);
    };

    const getTimeIntervals = (d: number) => {
      // Show hourly ticks for windows up to ~6.5 hours
      if (d <= 0.27) return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
      if (d <= 0.5) return [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
      if (d <= 1) return [3, 6, 9, 12, 15, 18, 21];
      if (d <= 3) return [0, 4, 8, 12, 16, 20];
      if (d <= 5) return [6, 12, 18];
      if (d <= 7) return [12];
      if (d <= 16) return [];
      return [];
    };

    const getDayStep = (d: number) => {
      if (d <= 16) return 1;
      if (d <= 30) return 2;
      if (d <= 60) return 3;
      if (d <= 90) return 5;
      return Math.max(1, Math.floor(d / 10));
    };

    const dayStep = getDayStep(daysDiff);
    let current = new Date(firstDate);
    current.setUTCHours(0, 0, 0, 0);
    if (current < firstDate) current.setUTCDate(current.getUTCDate() + 1);
    while (current <= lastDate) {
      addDayTick(current);
      current.setUTCDate(current.getUTCDate() + dayStep);
    }

    // Decouple hour tick visibility from day step so hour labels don't
    // disappear just because the day label density changes while panning.
    const intervals = getTimeIntervals(daysDiff);
    if (intervals.length) {
      current = new Date(firstDate);
      current.setUTCHours(0, 0, 0, 0);
      // Do NOT skip the first day even if midnight is before firstDate.
      // Instead, include hour ticks only when their exact timestamp is within the visible window.
      while (current <= lastDate) {
        for (const h of intervals) {
          const t = new Date(current);
          t.setUTCHours(h, 0, 0, 0);
          if (t >= firstDate && t <= lastDate && h !== 0) addCleanTimeTick(t);
        }
        current.setUTCDate(current.getUTCDate() + 1);
      }
    }

    return { ticks: Array.from(ticks), dayTicks };
  }, []);

  const { ticks: xTicks, dayTicks } = useMemo(
    () => generateSmartTicks(slicedData, 0, Math.max(0, slicedData.length - 1), "x"),
    [slicedData, generateSmartTicks]
  );

  const CustomTick: React.FC<any> = ({ x, y, payload }) => {
    const date = toDate(payload.value);
    if (!date) return null;
    const isDay = dayTicks.has(String(payload.value)) || date.getUTCHours() === 0;
    const label = isDay
      ? date.toLocaleDateString(undefined, { timeZone: "UTC", day: "2-digit", month: "short" })
      : `${date.toLocaleTimeString(undefined, { timeZone: "UTC", hour: "2-digit", hour12: false }).split(":")[0]}:00`;
    return (
      <g transform={`translate(${x},${y})`}>
        <text dy={16} textAnchor="middle" style={{ fontSize: 10, userSelect: "none" }} fill={isDay ? "rgb(var(--content-primary))" : "rgb(var(--content-tertiary))"} fontWeight={isDay ? "600" : "400"}>
          {label}
        </text>
      </g>
    );
  };

  const renderXAxisTick = useCallback((props: any) => <CustomTick {...props} />, [dayTicks]);

  // Removed scroll-to-zoom behavior per request

  const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
    // Keep tooltip visible on outage areas too: allow empty payload
    if (!active) return null;
    const d = toDate(label);
    const title = d
      ? d.toLocaleString(undefined, {
          timeZone: "UTC",
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : String(label);

    // Build a complete list of devices for the hovered timestamp, even if missing
    const targetIso = String(label ?? payload?.[0]?.payload?.x ?? "");
    let rowAtLabel = slicedData.find((r: any) => String(r.x) === targetIso) as any | undefined;
    if (!rowAtLabel && d) {
      // Fallback: find closest row by time when exact match isn't available
      let best: any | undefined;
      let bestDiff = Number.POSITIVE_INFINITY;
      for (const r of slicedData as any[]) {
        const rd = toDate((r as any).x);
        if (!rd) continue;
        const diff = Math.abs(+rd - +d);
        if (diff < bestDiff) {
          best = r;
          bestDiff = diff;
        }
      }
      rowAtLabel = best;
    }
    // Get the data from the payload first, as it contains the actual displayed values
    const items = visibleDeviceIds.map((id) => {
      let value: number | undefined;
      let band: BandCode | undefined;

      // First try to get the value from the payload (this contains the actual displayed values)
      if (payload && payload.length > 0) {
        for (const p of payload) {
          const key = p.dataKey as string;
          if (key.startsWith(`${id}__band_`)) {
            const val = p.value;
            if (typeof val === "number" && !Number.isNaN(val)) {
              value = val;
              band = key.split("__band_")[1] as BandCode;
              break;
            }
          }
        }
      }
      
      // Fallback to rowAtLabel if no value found in payload
      if (value === undefined && rowAtLabel) {
        for (const code of ["24", "5", "5m"] as BandCode[]) {
          const bandValue = (rowAtLabel as any)[`${id}__band_${code}`];
          if (typeof bandValue === "number" && !Number.isNaN(bandValue)) {
            value = bandValue;
            band = code;
            break;
          }
        }
      }
      
      return { id, value, band } as { id: string; value: any; band?: BandCode };
    });

    return (
      <div
        className="flex flex-col"
        style={{
          backgroundColor: "rgb(var(--surface-overlay))",
          border: "1px solid var(--gradient-border)",
          borderRadius: 8,
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
          padding: 16,
          width: 280,
          gap: 8,
        }}
      >
        <div style={{ fontSize: 12 }} className="text-content-primary font-medium">{title}</div>
        <div className="flex flex-col" style={{ gap: 4 }}>
        {items.map(({ id, value, band }) => {
          const color = DEVICE_COLORS[id] || "#999";
          const labelText = deviceNames[id] || id;
          const hasNumeric = typeof value === "number" && !Number.isNaN(value);
          const valueText = hasNumeric ? String(value) : "N/A";
          const valueColor = hasNumeric ? "rgb(var(--content-primary))" : "rgb(var(--content-tertiary))";
          const bandLabel = band ? BAND_LABEL[band] : null;
          return (
            <div key={id} className="flex items-center" style={{ minHeight: 20 }}>
              {/* Name column - fixed width with truncation */}
              <div className="flex items-center" style={{ width: 160, gap: 4, fontSize: 12, flexShrink: 0 }}>
                <span
                  className="inline-block flex-shrink-0"
                  style={{ width: 8, height: 8, borderRadius: 9999, backgroundColor: color }}
                />
                <span className="text-content-secondary" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{labelText}</span>
              </div>

              {/* Value column - fixed width, right aligned */}
              <div className="font-medium" style={{ width: 50, fontSize: 12, color: valueColor, textAlign: "right" }}>
                {valueText}
              </div>

              {/* Band column - fixed width */}
              <div className="text-content-tertiary" style={{ width: 70, fontSize: 11, paddingLeft: 8 }}>
                {hasNumeric && bandLabel}
              </div>
            </div>
                          );
                        })}
                        </div>
                      </div>
                    );
                  };

  if (loading) {
    return (
      <div className="w-full p-5 bg-white rounded-md border border-gray-200">Loading latency dataset…</div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-5 bg-white rounded-md border border-red-200 text-red-700">{error}</div>
    );
  }

  return (
    <div className="w-full bg-surface-tile border border-gradient-border rounded-lg overflow-visible">
      <div className="p-5 flex flex-col items-start gap-3">
        {/* Title row with actions on the right */}
        <div className="w-full flex items-top justify-between relative">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-content-primary">Client history</h3>
            <button
              type="button"
              className="inline-flex items-center h-8 pl-3 pr-2 rounded-lg bg-surface-action hover:bg-surface-action-hover transition-colors text-content-primary border border-gradient-border"
            >
              <span className="text-xs font-medium">Latency</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="ml-1.5"
                aria-hidden
              >
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          {/* Actions container (right-aligned) */}
          <div className="flex items-center gap-2">

            <div className="relative group">
              <button
                type="button"
                aria-label="WiFi Bands"
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-surface-action hover:bg-surface-action-hover transition-colors text-content-primary"
                onClick={() => { setIsFilterOpen(true); setFilterPanel("bands"); }}
                ref={filterButtonRef}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M5 12.55a11 11 0 0 1 14.08 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M1.42 9a16 16 0 0 1 21.16 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8.53 16.11a6 6 0 0 1 6.95 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 20h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 translate-y-4 group-hover:translate-y-0 mb-2 px-2 py-1 bg-surface-tile border border-gradient-border rounded text-xs text-content-primary whitespace-nowrap transition-all duration-200 shadow-md">
                Wi-Fi bands
              </div>
            </div>

            <div className="relative group">
              <button
                type="button"
                aria-label="Client Devices"
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-surface-action hover:bg-surface-action-hover transition-colors text-content-primary"
                onClick={() => { setIsFilterOpen(true); setFilterPanel("clients"); }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <rect x="7" y="2" width="10" height="20" rx="2" stroke="currentColor" strokeWidth="2" />
                  <line x1="12" y1="18" x2="12" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
              <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 translate-y-4 group-hover:translate-y-0 mb-2 px-2 py-1 bg-surface-tile border border-gradient-border rounded text-xs text-content-primary whitespace-nowrap transition-all duration-200 shadow-md">
                Client devices
              </div>
            </div>
          </div>
          {/* Filter Popover (anchored to header to avoid flex gap reflow) */}
          {isFilterOpen && (
            <div
              ref={filterPopoverRef}
              className="absolute right-0 top-full mt-2 z-50"
              style={{ display: "flex", gap: 24 }}
            >
              {/* Root panel */}
              <div className={`w-64 rounded-lg border border-gradient-border bg-surface-section shadow-md ${filterPanel === "root" ? "block" : "hidden"}`}>
                <div className="px-2 pt-3 flex items-center">
                  <div className="text-xs text-content-tertiary leading-4">FILTER</div>
                </div>
                <div className="p-2 space-y-1">
                <button
                  className="w-full flex items-center justify-between px-3 h-9 rounded-md bg-surface-action hover:bg-surface-action--hover transition-colors"
                  onClick={() => setFilterPanel("bands")}
                >
                  <div className="flex items-center gap-2">
                    {/* Feather wifi icon */}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M5 12.55a11 11 0 0 1 14.08 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M1.42 9a16 16 0 0 1 21.16 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 20h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="text-sm text-content-primary">Bands</span>
                  </div>
                  {/* Feather chevron-right */}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className="pointer-events-none">
                    <polyline points="9 18 15 12 9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  className="w-full flex items-center justify-between px-3 h-9 rounded-md bg-surface-action hover:bg-surface-action--hover transition-colors"
                  onClick={() => setFilterPanel("clients")}
                >
                  <div className="flex items-center gap-2">
                    {/* Feather smartphone icon */}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <rect x="7" y="2" width="10" height="20" rx="2" stroke="currentColor" strokeWidth="2" />
                      <line x1="12" y1="18" x2="12" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <span className="text-sm text-content-primary">Clients</span>
                  </div>
                  {/* Feather chevron-right */}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className="pointer-events-none">
                    <polyline points="9 18 15 12 9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                </div>
              </div>

              {/* Bands panel */}
              {filterPanel !== "root" && (
                <div className="w-64 rounded-lg border border-gradient-border bg-surface-section shadow-md">
                  <div className="px-3 py-2 border-b border-gradient-border">
                    <div className="text-xs text-content-tertiary leading-4">{filterPanel === "bands" ? "BANDS" : "CLIENTS"}</div>
                  </div>
                  {filterPanel === "bands" && (
                    <div className="space-y-2 p-2">
                      {(["24", "5", "5m"] as BandCode[]).map((code) => {
                        const checked = selectedBands.has(code);
                        return (
                          <label
                            key={code}
                            className="flex items-center justify-between px-3 h-9 rounded-md bg-surface-action hover:bg-surface-action--hover transition-colors cursor-pointer"
                          >
                            <div className="text-sm text-content-primary">{BAND_LABEL[code]}</div>
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={checked}
                              onChange={() => {
                                setSelectedBands((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(code)) next.delete(code); else next.add(code);
                                  return next;
                                });
                              }}
                            />
                            <span className={`inline-flex items-center justify-center rounded-md flex-shrink-0 ${checked ? "bg-surface-accent-purple" : "bg-surface-tile border border-gradient-border"}`} style={{ width: 20, height: 20 }}>
                              {checked ? (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                                  <polyline points="20 6 9 17 4 12" stroke="rgb(var(--static-white))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              ) : null}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {filterPanel === "clients" && (
                    <div className="space-y-2 max-h-80 overflow-auto pr-1 p-2">
                      {deviceIds.map((id) => {
                        // Hide if another device is isolated
                        if (isolatedDevice && isolatedDevice !== id) return null;
                        const isImplicitAll = selectedClients.size === 0;
                        const checked = isImplicitAll ? true : selectedClients.has(id);
                        const color = DEVICE_COLORS[id] || "#999";
                        return (
                          <label
                            key={id}
                            className="flex items-center gap-6 px-3 py-2 rounded-md bg-surface-action hover:bg-surface-action--hover transition-colors cursor-pointer"
                          >
                            <div className="flex items-start gap-2 min-w-0 flex-1">
                              <span className="inline-block flex-shrink-0 mt-1" style={{ width: 10, height: 10, borderRadius: 9999, backgroundColor: color }} />
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="text-sm truncate text-content-primary">{deviceNames[id] || id}</span>
                                <span className="text-xs truncate text-content-tertiary">{
                                  // Map device IDs to fictitious MAC addresses
                                  {
                                    'dev-1': '00:1A:2B:3C:4D:5E',
                                    'dev-2': '00:2B:3C:4D:5E:6F',
                                    'dev-3': '00:3C:4D:5E:6F:7A',
                                    'dev-4': '00:4D:5E:6F:7A:8B',
                                    'dev-5': '00:5E:6F:7A:8B:9C',
                                    'dev-6': '00:6F:7A:8B:9C:0D',
                                    'dev-7': '00:7A:8B:9C:0D:1E',
                                    'dev-8': '00:8B:9C:0D:1E:2F',
                                    'dev-9': '00:9C:0D:1E:2F:3A',
                                    'dev-10': '00:0D:1E:2F:3A:4B',
                                    'dev-11': '00:1E:2F:3A:4B:5C',
                                    'dev-12': '00:2F:3A:4B:5C:6D'
                                  }[id] || id
                                }</span>
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={checked}
                              onChange={() => {
                                setSelectedClients((prev) => {
                                  const base = prev.size === 0 ? new Set(deviceIds) : new Set(prev);
                                  if (base.has(id)) base.delete(id); else base.add(id);
                                  // collapse back to implicit-all when all selected
                                  if (base.size === deviceIds.length) return new Set();
                                  return base;
                                });
                              }}
                            />
                            <span className={`inline-flex items-center justify-center rounded-md flex-shrink-0 ${checked ? "bg-surface-accent-purple" : "bg-surface-tile border border-gradient-border"}`} style={{ width: 20, height: 20 }}>
                              {checked ? (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                                  <polyline points="20 6 9 17 4 12" stroke="rgb(var(--static-white))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              ) : null}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Popover moved inside header; removed extra flex child to avoid gap spacing */}

        {/* Legend row: device colors */}
        <div className="w-full flex flex-wrap items-center justify-start text-content-secondary text-xs" style={{ gap: "4px 4px" }}>
          {deviceIds.map((id) => {
            // Hide if device is not in selection OR if another device is isolated
            const isVisible = (selectedClients.size === 0 || selectedClients.has(id)) && 
                            (!isolatedDevice || isolatedDevice === id);
            if (!isVisible) return null;
            return (
              <div className="relative group">
                <div 
                  key={id} 
                  className="flex items-center hover:bg-surface-action-hover transition-colors rounded cursor-pointer" 
                  style={{ padding: "4px 8px" }}
                  onMouseEnter={() => setHoveredDevice(id)}
                  onMouseLeave={() => setHoveredDevice(null)}
                  onClick={(e) => {
                    if (isolatedDevice === id) {
                      // If this device is isolated, clicking it shows all devices
                      setIsolatedDevice(null);
                      setSelectedClients(new Set()); // Reset to show all devices
                    } else if (e.altKey) {
                      // Alt/Option + click for isolation
                      setIsolatedDevice(id);
                    } else {
                      setHoveredDevice(null); // Clear hover state when toggling visibility
                      setSelectedClients((prev) => {
                        const base = prev.size === 0 ? new Set(deviceIds) : new Set(prev);
                        if (base.has(id)) base.delete(id); else base.add(id);
                        // collapse back to implicit-all when all selected
                        if (base.size === deviceIds.length) return new Set();
                        return base;
                      });
                    }
                  }}
                >
                  <span
                    className="inline-block rounded-full"
                    style={{
                      width: 8,
                      height: 8,
                      backgroundColor: DEVICE_COLORS[id] || "#999",
                      marginRight: 4
                    }}
                  />
                  <span>{deviceNames[id] || id}</span>
                </div>
                <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-surface-tile border border-gradient-border rounded text-xs text-content-primary whitespace-nowrap shadow-md">
                  {isolatedDevice === id ? (
                    <div className="font-medium">Click to show all</div>
                  ) : (
                    <>
                      <div className="mb-1 font-medium">Click to {selectedClients.has(id) ? 'hide' : 'show'}</div>
                      <div className="text-content-tertiary">
                        {navigator.platform.toLowerCase().includes('mac') ? '⌥' : 'Alt'} + Click to show only this device
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {(selectedClients.size > 0 || isolatedDevice) && (
            <div className="relative group">
              <div 
                className="flex items-center hover:bg-surface-action-hover transition-colors rounded cursor-pointer text-content-tertiary"
                style={{ padding: "4px 8px" }}
                onClick={() => {
                  setHoveredDevice(null); // Clear hover state when showing all devices
                  setIsolatedDevice(null); // Exit isolation mode
                  setSelectedClients(new Set()); // Show all devices
                }}
              >
                <span>
                  {`Show ${isolatedDevice 
                    ? deviceIds.length - 1 // When isolated, all devices except the isolated one are hidden
                    : deviceIds.length - selectedClients.size} hidden devices`}
                </span>
              </div>
              {/* Tooltip anchored at the bottom */}
              {!isolatedDevice && (
                <div className="hidden group-hover:block absolute left-1/2 -translate-x-1/2 w-64 p-3 bg-surface-tile rounded-lg shadow-md border border-gradient-border" style={{ top: "calc(100% + 8px)", zIndex: 50 }}>
                  <div className="text-xs font-medium mb-2 text-content-primary">Hidden devices:</div>
                  <div className="space-y-2">
                    {deviceIds.map((id) => {
                      const isHidden = !selectedClients.has(id);
                      if (!isHidden) return null;
                      return (
                        <div key={id} className="flex items-center gap-2">
                          <span
                            className="inline-block rounded-full"
                            style={{
                              width: 6,
                              height: 6,
                              backgroundColor: DEVICE_COLORS[id] || "#999",
                            }}
                          />
                          <span className="text-xs truncate text-content-secondary">{deviceNames[id] || id}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Legend row: band styles */}
        <div className="w-full flex items-center justify-start gap-2 text-content-secondary">
          {(["24", "5", "5m"] as BandCode[]).map((code) => (
            <div key={code} className="flex items-center gap-1 text-xs rounded" style={{ padding: "4px 8px" }}>
              <svg width="24" height="8" viewBox="0 0 24 8" aria-hidden>
                <line x1="2" y1="4" x2="22" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray={BAND_DASH[code]} />
              </svg>
              <span>{BAND_LABEL[code]}</span>
            </div>
          ))}
        </div>
      </div>

              <div className="p-5">
        <div style={{ height: 360, overflow: "visible" }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={slicedDataBanded} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border-border-flat))" vertical={false} />
              <XAxis
                dataKey="x"
                tickMargin={8}
                axisLine={false}
                tickLine={false}
                interval={0}
                ticks={xTicks as any}
                tick={renderXAxisTick as any}
              />
              <YAxis
                tickMargin={8}
                axisLine={false}
                tickLine={false}
                domain={[0, 30]}
                label={{ value: 'ms', angle: -90, position: 'insideLeft', style: { fill: "rgb(var(--content-tertiary))", fontSize: 12 } }}
                tick={{ fontSize: 11, fill: "rgb(var(--content-tertiary))", style: { userSelect: "none" } as any }}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgb(var(--border-border-flat))" }} offset={12} />

              {/* Shaded bands for global outages in the visible window */}
              {/* Defs for diagonal hatch pattern */}
              <defs>
                <pattern id="outageHatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
                  <line x1="0" y1="0" x2="0" y2="8" stroke="rgb(var(--border-border-flat))" strokeWidth="2" />
                </pattern>
              </defs>

              {outageRanges.map((r, i) => (
                <ReferenceArea
                  key={`outage-${i}`}
                  x1={r.x1}
                  x2={r.x2}
                  fill="rgb(var(--surface-tile))"
                  fillOpacity={1}
                  stroke="rgb(var(--border-border-flat))"
                />
              ))}

              {/* Overlay subtle hatch on top for visibility without heavy contrast */}
              {outageRanges.map((r, i) => (
                <ReferenceArea
                  key={`outage-hatch-${i}`}
                  x1={r.x1}
                  x2={r.x2}
                  fill="url(#outageHatch)"
                  fillOpacity={0.7}
                  stroke="rgb(var(--border-border-flat))"
                />
              ))}
              
              {visibleDeviceIds.flatMap((id) => (
                (["24", "5", "5m"] as BandCode[]).filter((code) => selectedBands.has(code)).map((code) => {
                  const key = `${id}__band_${code}`;
                  const color = DEVICE_COLORS[id] || "#555";
                  return (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      name={id}
                      dot={getBoundaryDotForKey(key, color) as any}
                      strokeWidth={1.5}
                      stroke={color}
                      strokeDasharray={BAND_DASH[code]}
                      isAnimationActive={false}
                      connectNulls={false}
                      strokeOpacity={hoveredDevice === null || hoveredDevice === id.split('__band_')[0] ? 1 : 0.15}
                      // No transition for instant opacity change
                      activeDot={{
                        stroke: "rgb(var(--surface-tile))",
                        strokeWidth: 2,
                        r: 4,
                        opacity: hoveredDevice === null || hoveredDevice === id.split('__band_')[0] ? 1 : 0.15,
                        style: {}
                      }}
                    />
                  );
                })
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div>
          <ExternalBrush
            data={data as any}
            xKey="x"
            startIndex={range.left}
            endIndex={range.right}
            minSelectionPoints={6}
            maxSelectionPoints={24 * 15}
            onChange={({ startIndex, endIndex }) => setRange({ left: startIndex, right: endIndex })}
          />
        </div>
      </div>
    </div>
  );
}


