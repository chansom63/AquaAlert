import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { api } from '../../api/client';
import { DEMO_SOURCES } from '../../data/demoDataset';
import { GWALIOR_WARDS_66 } from '../../data/gwaliorWardsData.js';
import type { Reading, Source } from '../../types/water';
import { OverviewParametersView } from '../parameters/OverviewParametersView';
import { HistoricalParameterChart } from '../charts/HistoricalParameterChart';
import { ChronologicalSamplesTable } from '../readings/ChronologicalSamplesTable';
import { LabReportsEvidenceView } from '../evidence/LabReportsEvidenceView';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Loader2 } from 'lucide-react';

const WardDrawerTabs: FC<{ sources: Source[]; wardNumber: number }> = ({ sources, wardNumber }) => {
  const [tab, setTab] = useState('Overview & Parameters');
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loadingReadings, setLoadingReadings] = useState(false);
  const [chartParam, setChartParam] = useState('TDS');

  const ward = GWALIOR_WARDS_66.find(item => item.wardNumber === wardNumber) || GWALIOR_WARDS_66[13];
  const station =
    sources.find(item => Number(item.wardNumber) === wardNumber || item.sourceId === `gmc-ward-${String(wardNumber).padStart(2, '0')}`) ||
    DEMO_SOURCES[wardNumber - 1] || {
      sourceId: `source-gwl-${String(wardNumber).padStart(3, '0')}`,
      name: ward.waterSource,
      isDemo: true,
    };

  useEffect(() => {
    setLoadingReadings(true);
    api<Reading[]>(`/sources/${encodeURIComponent(station.sourceId)}/readings`)
      .then(items => setReadings(Array.isArray(items) ? items : []))
      .catch(() => setReadings([]))
      .finally(() => setLoadingReadings(false));
  }, [station.sourceId]);

  const sampleCount = readings.length;
  const tabList = ['Overview & Parameters', 'Historical Trend Charts', `Chronological Samples (${sampleCount})`, 'Lab Reports & Evidence'];

  const latestReading = readings.length > 0
    ? [...readings].sort((a, b) => new Date(b.collectedAt || 0).getTime() - new Date(a.collectedAt || 0).getTime())[0]
    : null;

  const rawParams = (latestReading?.parameters || {}) as Record<string, { value: number | string; unit?: string } | undefined>;
  const pHVal = Number(rawParams.pH?.value ?? rawParams.ph?.value ?? (parseFloat(ward.pH) || 7.2));
  const tdsVal = Number(rawParams.TDS?.value ?? rawParams.tds?.value ?? (parseFloat(ward.tds) || 620));
  const turVal = Number(rawParams.Turbidity?.value ?? rawParams.turbidity?.value ?? (parseFloat(ward.turbidity) || 0.85));
  const clVal = Number(rawParams.Chlorine?.value ?? rawParams.freeChlorine?.value ?? (parseFloat(ward.chlorine) || 0.45));
  const flVal = Number(rawParams.Fluoride?.value ?? rawParams.fluoride?.value ?? 0.7);
  const nitVal = Number(rawParams.Nitrate?.value ?? rawParams.nitrate?.value ?? 18);
  const hasBacteria = rawParams.Bacteria?.value === 'Detected';
  const isAnomalous = ward.status === 'ATTENTION' || tdsVal > 500 || turVal > 1.0 || hasBacteria;

  return (
    <div className="ward-detail-tabs font-sans text-left">
      <div className="ward-detail-heading">
        <div>
          <span className="station-id font-mono">{station.sourceId}</span>
          <span className="station-kind">{station.isDemo ? 'DEMO STATION' : 'WATER STATION'}</span>
          <h3>{station.name || ward.waterSource}</h3>
          <p>
            {ward.locality} · Ward {String(wardNumber).padStart(2, '0')} · {ward.zoneName}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <nav className="ward-card-navbar">
          {tabList.map(item => (
            <button key={item} type="button" className={(tab === item || (item.startsWith('Chronological Samples') && tab.startsWith('Chronological Samples'))) ? 'active' : ''} onClick={() => setTab(item)}>
              {item}
            </button>
          ))}
        </nav>
        {loadingReadings && (
          <div className="flex items-center gap-2 px-3 py-1 text-xs text-sky-400 font-mono">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
            <span>Fetching readings…</span>
          </div>
        )}
      </div>
      <div className="ward-detail-content pt-3">
        {tab === 'Overview & Parameters' && (
          <OverviewParametersView
            stationRef={station.sourceId}
            sampleCollected={latestReading?.collectedAt ? new Date(latestReading.collectedAt).toUTCString() : "Sat, 24 Oct 2026 07:30:00 GMT"}
            serverIngested={latestReading?.receivedAt || latestReading?.collectedAt || "2026-10-24T07:31:12Z"}
            method={latestReading?.method || "FIELD_SCREENING"}
            statusBadge={isAnomalous ? 'FLAGGED_ANOMALY' : 'MONITORING_NORMAL'}
            isAnomaly={isAnomalous}
            parameters={{
              pH: { value: pHVal, unit: 'pH' },
              tds: { value: tdsVal, unit: 'mg/L' },
              turbidity: { value: turVal, unit: 'NTU' },
              fluoride: { value: flVal, unit: 'mg/L' },
              nitrate: { value: nitVal, unit: 'mg/L' },
              freeChlorine: { value: clVal, unit: 'mg/L' },
            }}
            onOpenCharts={() => setTab('Historical Trend Charts')}
            showFooter={true}
          />
        )}
        {tab === 'Historical Trend Charts' && (
          <div className="space-y-4">
            {loadingReadings && readings.length === 0 ? (
              <LoadingSpinner
                size="sm"
                label={`Fetching historical readings for Ward ${wardNumber}…`}
                sublabel="Synchronizing records with central database"
              />
            ) : (
              <>
                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
                  {['TDS', 'pH', 'turbidity', 'fluoride', 'nitrate', 'freeChlorine'].map(param => (
                    <button
                      key={param}
                      type="button"
                      onClick={() => setChartParam(param)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition cursor-pointer border-0 ${
                        chartParam === param
                          ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20 font-bold'
                          : 'bg-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      {param}
                    </button>
                  ))}
                </div>
                <HistoricalParameterChart readings={readings} parameterKey={chartParam} />
              </>
            )}
          </div>
        )}
        {tab.startsWith('Chronological Samples') && (
          loadingReadings && readings.length === 0 ? (
            <LoadingSpinner
              size="sm"
              label={`Fetching chronological samples for Ward ${wardNumber}…`}
              sublabel="Synchronizing records with central database"
            />
          ) : (
            <ChronologicalSamplesTable
              readings={readings}
              wardNumber={wardNumber}
              sourceId={station.sourceId}
              sourceName={station.name || ward.waterSource}
            />
          )
        )}
        {tab === 'Lab Reports & Evidence' && (
          <LabReportsEvidenceView
            wardNumber={wardNumber}
            sourceId={station.sourceId}
            sourceName={station.name || ward.waterSource}
          />
        )}
      </div>
    </div>
  );
};

export default WardDrawerTabs;
