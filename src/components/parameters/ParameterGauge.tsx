import type { FC } from 'react';
import { HelpCircle } from 'lucide-react';

export interface ParameterData {
  value: number;
  unit: string;
}

export interface ParameterStandard {
  min?: number;
  max?: number;
  acceptable?: number;
  label?: string;
}

export interface ParameterGaugeProps {
  name: string;
  data?: ParameterData | null;
  standards?: Record<string, ParameterStandard>;
}

export const ParameterGauge: FC<ParameterGaugeProps> = ({ name, data, standards = {} }) => {
  // If data is absent, UX safety rule mandates: never show 0 or safe!
  if (!data || data.value === undefined || data.value === null) {
    return (
      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
          <span className="font-semibold uppercase tracking-wider">{name}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
            ABSENT
          </span>
        </div>
        <div className="my-2 flex items-center space-x-1.5 text-slate-400">
          <HelpCircle className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-400">No Data / Stale</span>
        </div>
        <p className="text-[10px] text-slate-400">
          Absence of data is not evidence of water safety.
        </p>
      </div>
    );
  }

  const { value, unit } = data;
  const std = standards[name] || standards[name.toLowerCase()] || { min: 0, max: 100, acceptable: 50 };

  // Determine status according to BIS IS 10500:2012 limits
  let isBreached = false;
  let statusText = 'Within Standard';
  let badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';

  const nLower = name.toLowerCase();
  if (nLower === 'ph') {
    if (value < 6.5 || value > 8.5) {
      isBreached = true;
      statusText = value < 6.5 ? 'Acidic (<6.5)' : 'Alkaline (>8.5)';
      badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    }
  } else if (nLower === 'tds') {
    if (value > 500) {
      isBreached = true;
      statusText = value > 2000 ? 'Exceeds Permissible (>2000)' : 'Above Acceptable (>500)';
      badgeColor = value > 2000 ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    }
  } else if (nLower === 'turbidity') {
    if (value > 1.0) {
      isBreached = true;
      statusText = value > 5.0 ? 'High (>5.0 NTU)' : 'Screening Notice (>1.0)';
      badgeColor = value > 5.0 ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    }
  } else if (nLower === 'fluoride') {
    if (value > 1.0) {
      isBreached = true;
      statusText = value > 1.5 ? 'Critical Toxic (>1.5)' : 'Elevated (>1.0)';
      badgeColor = value > 1.5 ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    }
  } else if (nLower === 'nitrate') {
    if (value > 45.0) {
      isBreached = true;
      statusText = 'Exceeds Limit (>45)';
      badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
    }
  } else if (nLower === 'freechlorine' || nLower === 'chlorine') {
    if (value < 0.2 || value > 1.0) {
      if (value < 0.2) {
        // low residual chlorine
        statusText = 'Within Standard';
      } else {
        isBreached = true;
        statusText = 'High (>1.0)';
        badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      }
    }
  }

  // Calculate percentage bar fill safely
  const minRange = std.min !== undefined ? std.min : 0;
  const maxRange = std.max !== undefined ? std.max : Math.max(value * 1.5, 100);
  const percent = Math.min(100, Math.max(0, ((value - minRange) / (maxRange - minRange)) * 100));

  // Reference label
  let stdLabel = '';
  if (std.label) {
    stdLabel = std.label;
  } else if (nLower === 'ph') {
    stdLabel = 'Std: < 8.5 pH';
  } else if (nLower === 'tds') {
    stdLabel = 'Std: < 500 mg/L';
  } else if (nLower === 'turbidity') {
    stdLabel = 'Std: < 1 NTU';
  } else if (nLower === 'fluoride') {
    stdLabel = 'Std: < 1 mg/L';
  } else if (nLower === 'nitrate') {
    stdLabel = 'Std: < 45 mg/L';
  } else if (nLower === 'freechlorine' || nLower === 'chlorine') {
    stdLabel = 'Std: < 0.2 mg/L';
  } else {
    stdLabel = std.acceptable ? `Std: < ${std.acceptable} ${unit}` : 'BIS IS 10500';
  }

  return (
    <div
      className={`p-3.5 rounded-xl border transition-all ${
        isBreached
          ? 'bg-slate-900/90 border-amber-500/40 shadow-sm'
          : 'bg-slate-900/40 border-slate-800'
      }`}
    >
      {/* Parameter Header */}
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-semibold text-slate-300 uppercase tracking-wider">{name}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${badgeColor}`}>
          {statusText}
        </span>
      </div>

      {/* Main Value Display */}
      <div className="flex items-baseline space-x-1.5 my-1.5">
        <span className="text-2xl font-bold font-mono text-white tracking-tight">
          {value}
        </span>
        <span className="text-xs text-sky-400 font-mono font-medium">
          {unit}
        </span>
      </div>

      {/* Progress Bar with Acceptable Zone Marker */}
      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden my-2 relative">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isBreached ? 'bg-gradient-to-r from-amber-500 to-rose-500' : 'bg-sky-400'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Standard Reference Footnote */}
      <div className="text-[10px] text-slate-400 flex items-center justify-between font-mono">
        <span>BIS IS 10500</span>
        <span>{stdLabel}</span>
      </div>
    </div>
  );
};

export default ParameterGauge;
