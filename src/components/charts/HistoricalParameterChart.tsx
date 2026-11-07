import { useState } from 'react';
import type { FC } from 'react';
import { Info } from 'lucide-react';
import type { Reading } from '../../types/water';

interface ParameterConfig {
  name: string;
  unit: string;
  minScale: number;
  maxScale: number;
  acceptableLow?: number;
  acceptableHigh?: number;
  permissibleHigh?: number;
  color: string;
}

const PARAM_CONFIGS: Record<string, ParameterConfig> = {
  pH: {
    name: 'pH (Potential of Hydrogen)',
    unit: 'pH',
    minScale: 5.5,
    maxScale: 9.5,
    acceptableLow: 6.5,
    acceptableHigh: 8.5,
    permissibleHigh: 8.5,
    color: '#38bdf8'
  },
  TDS: {
    name: 'Total Dissolved Solids',
    unit: 'mg/L',
    minScale: 200,
    maxScale: 750,
    acceptableHigh: 500,
    permissibleHigh: 2000,
    color: '#0ea5e9'
  },
  turbidity: {
    name: 'Turbidity (Cloudiness)',
    unit: 'NTU',
    minScale: 0,
    maxScale: 6.0,
    acceptableHigh: 1.0,
    permissibleHigh: 5.0,
    color: '#06b6d4'
  },
  fluoride: {
    name: 'Fluoride Content (F-)',
    unit: 'mg/L',
    minScale: 0.2,
    maxScale: 2.5,
    acceptableHigh: 1.0,
    permissibleHigh: 1.5,
    color: '#a855f7'
  },
  nitrate: {
    name: 'Nitrate Concentration (NO3-)',
    unit: 'mg/L',
    minScale: 10,
    maxScale: 60,
    acceptableHigh: 45.0,
    permissibleHigh: 45.0,
    color: '#f43f5e'
  },
  freeChlorine: {
    name: 'Free Residual Chlorine',
    unit: 'mg/L',
    minScale: 0,
    maxScale: 1.5,
    acceptableLow: 0.2,
    acceptableHigh: 1.0,
    permissibleHigh: 1.0,
    color: '#10b981'
  }
};

interface ChartPoint {
  collectedAt: string;
  readingId: string;
  method?: string;
  verificationStatus?: string;
  value: number;
  unit: string;
}

export const HistoricalParameterChart: FC<{
  readings?: Reading[];
  parameterKey?: string;
}> = ({ readings = [], parameterKey = 'TDS' }) => {
  const [timeRange, setTimeRange] = useState<'7D' | '30D' | 'ALL'>('30D');
  const [hoveredPoint, setHoveredPoint] = useState<ChartPoint | null>(null);

  const cfg = PARAM_CONFIGS[parameterKey] || {
    name: parameterKey,
    unit: '',
    minScale: 0,
    maxScale: 100,
    acceptableHigh: 50,
    color: '#0ea5e9'
  };

  // Sort readings chronologically
  const sorted = [...readings].sort(
    (a, b) => new Date(a.collectedAt || 0).getTime() - new Date(b.collectedAt || 0).getTime(),
  );

  // If no readings, provide realistic demo sample points for visualization
  const sourceReadings: Reading[] = sorted.length > 0 ? sorted : [
    { readingId: 'gwl-sm-101', sourceId: 'source-gwl-014', collectedAt: '2026-10-18T08:00:00Z', receivedAt: '2026-10-18T08:01:10Z', method: 'FIELD_SCREENING', verificationStatus: 'SCREENED', parameters: { tds: { value: 580, unit: 'mg/L' }, pH: { value: 7.1, unit: 'pH' }, turbidity: { value: 0.75, unit: 'NTU' }, freeChlorine: { value: 0.50, unit: 'mg/L' }, fluoride: { value: 0.65, unit: 'mg/L' }, nitrate: { value: 16, unit: 'mg/L' } } },
    { readingId: 'gwl-sm-102', sourceId: 'source-gwl-014', collectedAt: '2026-10-20T08:00:00Z', receivedAt: '2026-10-20T08:01:15Z', method: 'LAB_SPECTROPHOTOMETRY', verificationStatus: 'LAB_VERIFIED', parameters: { tds: { value: 595, unit: 'mg/L' }, pH: { value: 7.2, unit: 'pH' }, turbidity: { value: 0.80, unit: 'NTU' }, freeChlorine: { value: 0.48, unit: 'mg/L' }, fluoride: { value: 0.68, unit: 'mg/L' }, nitrate: { value: 17, unit: 'mg/L' } } },
    { readingId: 'gwl-sm-103', sourceId: 'source-gwl-014', collectedAt: '2026-10-22T08:00:00Z', receivedAt: '2026-10-22T08:01:20Z', method: 'FIELD_SCREENING', verificationStatus: 'SCREENED', parameters: { tds: { value: 610, unit: 'mg/L' }, pH: { value: 7.3, unit: 'pH' }, turbidity: { value: 0.82, unit: 'NTU' }, freeChlorine: { value: 0.46, unit: 'mg/L' }, fluoride: { value: 0.70, unit: 'mg/L' }, nitrate: { value: 18, unit: 'mg/L' } } },
    { readingId: 'gwl-sm-104', sourceId: 'source-gwl-014', collectedAt: '2026-10-24T07:30:00Z', receivedAt: '2026-10-24T07:31:12Z', method: 'FIELD_SCREENING', verificationStatus: 'FLAGGED_ANOMALY', parameters: { tds: { value: 620, unit: 'mg/L' }, pH: { value: 7.2, unit: 'pH' }, turbidity: { value: 0.85, unit: 'NTU' }, freeChlorine: { value: 0.45, unit: 'mg/L' }, fluoride: { value: 0.70, unit: 'mg/L' }, nitrate: { value: 18, unit: 'mg/L' } } },
  ];

  const now = Date.now();
  const filtered = sourceReadings.filter(r => {
    if (timeRange === 'ALL') return true;
    const itemTime = new Date(r.collectedAt || 0).getTime();
    const daysAgo = (now - itemTime) / (1000 * 60 * 60 * 24);
    if (timeRange === '7D') return daysAgo <= 7;
    if (timeRange === '30D') return daysAgo <= 30;
    return true;
  });

  const dataPoints: ChartPoint[] = filtered
    .map((r): ChartPoint | null => {
      const params = r.parameters || {};
      const pKey = Object.keys(params).find(k => k.toLowerCase() === parameterKey.toLowerCase());
      const paramObj = pKey ? params[pKey] : null;

      if (!paramObj || paramObj.value === undefined) return null;
      return {
        collectedAt: r.collectedAt || new Date().toISOString(),
        readingId: r.readingId,
        method: r.method,
        verificationStatus: r.verificationStatus,
        value: paramObj.value,
        unit: paramObj.unit || cfg.unit
      };
    })
    .filter((p): p is ChartPoint => p !== null);

  const width = 640;
  const height = 240;
  const padding = { top: 25, right: 30, bottom: 35, left: 50 };

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const minVal = Math.min(cfg.minScale, ...(dataPoints.length ? dataPoints.map(d => d.value) : [cfg.minScale]));
  const maxVal = Math.max(cfg.maxScale, ...(dataPoints.length ? dataPoints.map(d => d.value) : [cfg.maxScale]));

  const getY = (val?: number | null) => {
    if (val === undefined || val === null) return 0;
    const ratio = (val - minVal) / (maxVal - minVal || 1);
    return padding.top + chartH - ratio * chartH;
  };

  const getX = (index: number) => {
    if (dataPoints.length <= 1) return padding.left + chartW / 2;
    return padding.left + (index / (dataPoints.length - 1)) * chartW;
  };

  const linePath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.value)}`).join(' ');

  const accLowY = cfg.acceptableLow !== undefined ? getY(cfg.acceptableLow) : null;
  const accHighY = cfg.acceptableHigh !== undefined ? getY(cfg.acceptableHigh) : null;

  return (
    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-white text-xs sm:text-sm">{cfg.name}</span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800/40">
              {cfg.unit}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
            Acceptable limit: {cfg.acceptableLow ? `${cfg.acceptableLow} - ` : '< '}{cfg.acceptableHigh} {cfg.unit}
          </p>
        </div>

        <div className="flex items-center space-x-1 self-start sm:self-center">
          {(['7D', '30D', 'ALL'] as const).map(range => (
            <button
              key={range}
              type="button"
              onClick={() => setTimeRange(range)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold transition cursor-pointer border-0 ${
                timeRange === range
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {dataPoints.length === 0 ? (
        <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-lg">
          <Info className="w-4 h-4 mb-1 text-slate-400" />
          <span>No historical records recorded for {cfg.name} in this time period.</span>
          <span className="text-[10px] text-slate-400">Missing intervals are not interpolated.</span>
        </div>
      ) : (
        <div className="relative overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none overflow-visible">
            <defs>
              <linearGradient id={`grad-${parameterKey}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={cfg.color} stopOpacity="0.25" />
                <stop offset="100%" stopColor={cfg.color} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {accHighY !== null && (
              <rect
                x={padding.left}
                y={accHighY}
                width={chartW}
                height={accLowY !== null ? accLowY - accHighY : height - padding.bottom - accHighY}
                fill="#10b981"
                fillOpacity="0.06"
              />
            )}

            {accHighY !== null && (
              <g>
                <line
                  x1={padding.left}
                  y1={accHighY}
                  x2={width - padding.right}
                  y2={accHighY}
                  stroke="#10b981"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={width - padding.right + 4}
                  y={accHighY + 3}
                  fill="#10b981"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  Limit: {cfg.acceptableHigh}
                </text>
              </g>
            )}

            <line
              x1={padding.left}
              y1={height - padding.bottom}
              x2={width - padding.right}
              y2={height - padding.bottom}
              stroke="#334155"
              strokeWidth="1"
            />
            <line
              x1={padding.left}
              y1={padding.top}
              x2={padding.left}
              y2={height - padding.bottom}
              stroke="#334155"
              strokeWidth="1"
            />

            <text x={padding.left - 6} y={getY(minVal)} fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">
              {minVal.toFixed(1)}
            </text>
            <text x={padding.left - 6} y={getY((minVal + maxVal) / 2)} fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">
              {((minVal + maxVal) / 2).toFixed(1)}
            </text>
            <text x={padding.left - 6} y={getY(maxVal)} fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">
              {maxVal.toFixed(1)}
            </text>

            <path
              d={linePath}
              fill="none"
              stroke={cfg.color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {dataPoints.map((pt, i) => {
              const cx = getX(i);
              const cy = getY(pt.value);
              const isBreached = cfg.acceptableHigh && pt.value > cfg.acceptableHigh;
              const isLabVerified = pt.verificationStatus === 'LAB_VERIFIED';

              return (
                <g
                  key={i}
                  className="cursor-pointer group"
                  onMouseEnter={() => setHoveredPoint(pt)}
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  {isBreached && (
                    <circle cx={cx} cy={cy} r="8" fill="#f43f5e" fillOpacity="0.25" className="animate-ping" />
                  )}

                  <circle
                    cx={cx}
                    cy={cy}
                    r={isLabVerified ? "5" : "4"}
                    fill={isBreached ? "#f43f5e" : isLabVerified ? "#a855f7" : cfg.color}
                    stroke="#0f172a"
                    strokeWidth="2"
                    className="transition-transform group-hover:scale-150"
                  />

                  <text
                    x={cx}
                    y={height - padding.bottom + 15}
                    fill="#64748b"
                    fontSize="8.5"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {new Date(pt.collectedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {hoveredPoint ? (
        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs flex flex-wrap items-center justify-between gap-2 animate-in fade-in duration-100">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-sky-400 font-bold">{hoveredPoint.readingId}</span>
            <span className="text-slate-400">•</span>
            <span className="text-white font-bold font-mono">
              Value: {hoveredPoint.value} {hoveredPoint.unit}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400">
            <span>Collected: {new Date(hoveredPoint.collectedAt).toUTCString().slice(5, 22)}</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] ${
              hoveredPoint.verificationStatus === 'LAB_VERIFIED'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'bg-slate-800 text-slate-300'
            }`}>
              {hoveredPoint.verificationStatus}
            </span>
          </div>
        </div>
      ) : (
        <div className="text-[10px] text-slate-400 flex items-center justify-between font-mono pt-1">
          <span className="flex items-center space-x-2">
            <span className="inline-block w-2 h-2 rounded-full bg-purple-400"></span>
            <span>LAB_VERIFIED</span>
            <span className="inline-block w-2 h-2 rounded-full bg-sky-400 ml-2"></span>
            <span>FIELD_SCREENING</span>
            <span className="inline-block w-2 h-2 rounded-full bg-rose-500 ml-2"></span>
            <span>THRESHOLD_EXCEEDED</span>
          </span>
          <span>Hover points to inspect exact readings</span>
        </div>
      )}
    </div>
  );
};

export default HistoricalParameterChart;
