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

const WardDrawerTabs: FC<{ sources: Source[]; wardNumber: number }> = ({ sources, wardNumber }) => {
  const [tab, setTab] = useState('Overview & Parameters');
  const [readings, setReadings] = useState<Reading[]>([]);
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
    api<Reading[]>(`/sources/${encodeURIComponent(station.sourceId)}/readings`)
      .then(items => setReadings(Array.isArray(items) ? items : []))
      .catch(() => setReadings([]));
  }, [station.sourceId]);

  const sampleCount = readings.length || 1;
  const tabList = ['Overview & Parameters', 'Historical Trend Charts', `Chronological Samples (${sampleCount})`, 'Lab Reports & Evidence'];

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
      <nav className="ward-card-navbar">
        {tabList.map(item => (
          <button key={item} type="button" className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>
            {item}
          </button>
        ))}
      </nav>
      <div className="ward-detail-content pt-3">
        {tab === 'Overview & Parameters' && (
          <OverviewParametersView
            stationRef={station.sourceId}
            sampleCollected="Sat, 24 Oct 2026 07:30:00 GMT"
            serverIngested="2026-10-24T07:31:12Z"
            method="FIELD_SCREENING"
            statusBadge={ward.status === 'ATTENTION' ? 'FLAGGED_ANOMALY' : 'MONITORING_NORMAL'}
            isAnomaly={ward.status === 'ATTENTION' || parseFloat(ward.tds) > 500}
            parameters={{
              pH: { value: parseFloat(ward.pH) || 7.2, unit: 'pH' },
              tds: { value: parseFloat(ward.tds) || 620, unit: 'mg/L' },
              turbidity: { value: parseFloat(ward.turbidity) || 0.85, unit: 'NTU' },
              fluoride: { value: 0.7, unit: 'mg/L' },
              nitrate: { value: 18, unit: 'mg/L' },
              freeChlorine: { value: parseFloat(ward.chlorine) || 0.45, unit: 'mg/L' },
            }}
            onOpenCharts={() => setTab('Historical Trend Charts')}
            showFooter={true}
          />
        )}
        {tab === 'Historical Trend Charts' && (
          <div className="space-y-4">
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
          </div>
        )}
        {tab.startsWith('Chronological Samples') && (
          <ChronologicalSamplesTable
            readings={readings}
            wardNumber={wardNumber}
            sourceId={station.sourceId}
            sourceName={station.name || ward.waterSource}
          />
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
