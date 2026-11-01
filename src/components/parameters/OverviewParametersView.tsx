import type { FC } from 'react';
import { Clock, TrendingUp, ChevronRight } from 'lucide-react';
import { ParameterGauge } from './ParameterGauge';

export interface OverviewParametersViewProps {
  stationRef?: string;
  sampleCollected?: string;
  serverIngested?: string;
  method?: string;
  statusBadge?: string;
  isAnomaly?: boolean;
  parameters?: {
    pH?: { value: number; unit: string };
    tds?: { value: number; unit: string };
    turbidity?: { value: number; unit: string };
    fluoride?: { value: number; unit: string };
    nitrate?: { value: number; unit: string };
    freeChlorine?: { value: number; unit: string };
  };
  onOpenCharts?: () => void;
  onCloseDrawer?: () => void;
  showFooter?: boolean;
}

export const OverviewParametersView: FC<OverviewParametersViewProps> = ({
  stationRef = 'source-gwl-014',
  sampleCollected = 'Sat, 24 Oct 2026 07:30:00 GMT',
  serverIngested = '2026-10-24T07:31:12Z',
  method = 'FIELD_SCREENING',
  statusBadge,
  isAnomaly = true,
  parameters = {
    pH: { value: 7.2, unit: 'pH' },
    tds: { value: 620, unit: 'mg/L' },
    turbidity: { value: 0.85, unit: 'NTU' },
    fluoride: { value: 0.7, unit: 'mg/L' },
    nitrate: { value: 18, unit: 'mg/L' },
    freeChlorine: { value: 0.45, unit: 'mg/L' },
  },
  onOpenCharts,
  onCloseDrawer,
  showFooter = true,
}) => {
  const activeStatusBadge = statusBadge || (isAnomaly ? 'FLAGGED_ANOMALY' : 'MONITORING_NORMAL');

  return (
    <div className="space-y-5 text-left font-sans">
      {/* 1. Sampling & Ingestion Timestamps Card */}
      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 flex-shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-slate-400 font-medium">Sampling &amp; Telemetry Timestamps</div>
            <div className="text-slate-200">
              Sample Collected:{' '}
              <strong className="font-mono text-sky-300 font-bold">{sampleCollected}</strong>
            </div>
            <div className="text-slate-400 text-[11px]">
              Server Ingested (receivedAt):{' '}
              <span className="font-mono">{serverIngested}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-shrink-0">
          <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-200 font-mono text-[11px] font-semibold border border-slate-700 tracking-wider">
            {method}
          </span>
          <span
            className={`px-2.5 py-1 rounded font-mono text-[11px] font-semibold tracking-wider ${
              isAnomaly
                ? 'bg-sky-950 text-sky-300 border border-sky-800'
                : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
            }`}
          >
            {activeStatusBadge}
          </span>
        </div>
      </div>

      {/* 2. Water Quality Parameter Gauges Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            CURRENT CHEMICAL SCREENING (BIS IS 10500:2012 LIMITS)
          </h4>
          <span className="text-[11px] text-slate-400 font-mono">
            Version: v1.2-active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <ParameterGauge
            name="PH"
            data={parameters.pH}
            standards={{ PH: { min: 4, max: 10, acceptable: 8.5, label: 'Std: < 8.5 pH' } }}
          />
          <ParameterGauge
            name="TDS"
            data={parameters.tds}
            standards={{ TDS: { min: 0, max: 2000, acceptable: 500, label: 'Std: < 500 mg/L' } }}
          />
          <ParameterGauge
            name="TURBIDITY"
            data={parameters.turbidity}
            standards={{ TURBIDITY: { min: 0, max: 10, acceptable: 1.0, label: 'Std: < 1 NTU' } }}
          />
          <ParameterGauge
            name="FLUORIDE"
            data={parameters.fluoride}
            standards={{ FLUORIDE: { min: 0, max: 3.0, acceptable: 1.0, label: 'Std: < 1 mg/L' } }}
          />
          <ParameterGauge
            name="NITRATE"
            data={parameters.nitrate}
            standards={{ NITRATE: { min: 0, max: 80, acceptable: 45.0, label: 'Std: < 45 mg/L' } }}
          />
          <ParameterGauge
            name="FREECHLORINE"
            data={parameters.freeChlorine}
            standards={{ FREECHLORINE: { min: 0, max: 2.0, acceptable: 0.2, label: 'Std: < 0.2 mg/L' } }}
          />
        </div>
      </div>

      {/* 3. Quick Jump to Trends */}
      <div className="p-3.5 rounded-xl bg-sky-950/30 border border-sky-800/40 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2 text-sky-200">
          <TrendingUp className="w-4 h-4 text-sky-400 flex-shrink-0" />
          <span>Inspect longitudinal trend lines &amp; threshold bands</span>
        </div>
        <button
          type="button"
          onClick={onOpenCharts}
          className="text-sky-400 hover:text-white font-bold flex items-center space-x-1 cursor-pointer bg-transparent border-0"
        >
          <span>Open Charts</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 4. Bottom Drawer Footer */}
      {showFooter && (
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400 font-mono">
            Station Ref: <span className="text-sky-300">{stationRef}</span>
          </div>

          {onCloseDrawer && (
            <button
              type="button"
              onClick={onCloseDrawer}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg text-xs transition cursor-pointer border-0"
            >
              Close Drawer
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default OverviewParametersView;
