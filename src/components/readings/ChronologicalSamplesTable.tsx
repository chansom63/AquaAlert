import type { FC } from 'react';
import { FileText, Clock } from 'lucide-react';
import type { Reading } from '../../types/water';

export interface ChronologicalSamplesTableProps {
  readings?: Reading[];
  wardNumber?: number;
  sourceId?: string;
  sourceName?: string;
}

export const ChronologicalSamplesTable: FC<ChronologicalSamplesTableProps> = ({
  readings = [],
  wardNumber = 14,
  sourceId = 'source-gwl-014',
  sourceName,
}) => {
  // If readings are not supplied or empty, generate realistic samples matching CC-Project format
  const displayReadings: Reading[] = readings.length > 0
    ? [...readings].sort((a, b) => new Date(b.collectedAt || 0).getTime() - new Date(a.collectedAt || 0).getTime())
    : [
    {
      readingId: `gwl-sm-104`,
      sourceId,
      collectedAt: '2026-10-24T07:30:00Z',
      receivedAt: '2026-10-24T07:31:12Z',
      method: 'FIELD_SCREENING',
      verificationStatus: 'FLAGGED_ANOMALY',
      hasEvidence: true,
      parameters: {
        pH: { value: 7.2, unit: 'pH' },
        tds: { value: 620, unit: 'mg/L' },
        turbidity: { value: 0.85, unit: 'NTU' },
        freeChlorine: { value: 0.45, unit: 'mg/L' },
        fluoride: { value: 0.70, unit: 'mg/L' },
        nitrate: { value: 18, unit: 'mg/L' },
      },
    },
    {
      readingId: `gwl-sm-103`,
      sourceId,
      collectedAt: '2026-10-22T08:00:00Z',
      receivedAt: '2026-10-22T08:01:20Z',
      method: 'FIELD_SCREENING',
      verificationStatus: 'SCREENED',
      hasEvidence: false,
      parameters: {
        pH: { value: 7.3, unit: 'pH' },
        tds: { value: 610, unit: 'mg/L' },
        turbidity: { value: 0.82, unit: 'NTU' },
        freeChlorine: { value: 0.46, unit: 'mg/L' },
        fluoride: { value: 0.70, unit: 'mg/L' },
        nitrate: { value: 18, unit: 'mg/L' },
      },
    },
    {
      readingId: `gwl-sm-102`,
      sourceId,
      collectedAt: '2026-10-20T08:00:00Z',
      receivedAt: '2026-10-20T08:01:15Z',
      method: 'LAB_SPECTROPHOTOMETRY',
      verificationStatus: 'LAB_VERIFIED',
      hasEvidence: true,
      parameters: {
        pH: { value: 7.2, unit: 'pH' },
        tds: { value: 595, unit: 'mg/L' },
        turbidity: { value: 0.80, unit: 'NTU' },
        freeChlorine: { value: 0.48, unit: 'mg/L' },
        fluoride: { value: 0.68, unit: 'mg/L' },
        nitrate: { value: 17, unit: 'mg/L' },
      },
    },
    {
      readingId: `gwl-sm-101`,
      sourceId,
      collectedAt: '2026-10-18T08:00:00Z',
      receivedAt: '2026-10-18T08:01:10Z',
      method: 'DIGITAL_PROBE_ESP32',
      verificationStatus: 'SCREENED',
      hasEvidence: false,
      parameters: {
        pH: { value: 7.1, unit: 'pH' },
        tds: { value: 580, unit: 'mg/L' },
        turbidity: { value: 0.75, unit: 'NTU' },
        freeChlorine: { value: 0.50, unit: 'mg/L' },
        fluoride: { value: 0.65, unit: 'mg/L' },
        nitrate: { value: 16, unit: 'mg/L' },
      },
    },
  ];

  return (
    <div className="space-y-4 font-sans text-left">
      {/* Header bar from CC-Project */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-sky-400 flex-shrink-0" />
          <span>
            Recent chronological sample submissions queried from{' '}
            <code className="text-sky-300 font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
              WaterReadings
            </code>{' '}
            table.
          </span>
        </div>
        <span className="font-mono text-[11px] text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 self-start sm:self-auto">
          Sort Key: collectedAt#readingId
        </span>
      </div>

      {/* Chronological Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 shadow-xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono text-[11px]">
            <tr>
              <th className="p-3 font-semibold">Reading ID</th>
              <th className="p-3 font-semibold">Collection Time (UTC)</th>
              <th className="p-3 font-semibold">Method</th>
              <th className="p-3 font-semibold">Status</th>
              <th className="p-3 font-semibold">Parameters Measured</th>
              <th className="p-3 font-semibold text-center">Evidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 font-mono text-slate-300 text-xs">
            {displayReadings.map(r => (
              <tr key={r.readingId} className="hover:bg-slate-800/40 transition-colors">
                <td className="p-3 text-sky-400 font-semibold">{r.readingId}</td>
                <td className="p-3 text-slate-300 whitespace-nowrap">
                  {r.collectedAt ? new Date(r.collectedAt).toUTCString() : 'N/A'}
                </td>
                <td className="p-3 font-sans text-slate-400 whitespace-nowrap">{r.method || 'FIELD_SCREENING'}</td>
                <td className="p-3 whitespace-nowrap">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      r.verificationStatus === 'LAB_VERIFIED'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : r.verificationStatus === 'FLAGGED_ANOMALY'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {r.verificationStatus || 'SCREENED'}
                  </span>
                </td>
                <td className="p-3 font-sans">
                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    {Object.entries(r.parameters || {}).map(([k, v]) => (
                      <span
                        key={k}
                        className="px-2 py-0.5 bg-slate-900 rounded border border-slate-800 text-slate-300"
                      >
                        <span className="text-slate-400 uppercase font-mono text-[10px] mr-1">{k}:</span>
                        <strong className="text-white font-mono">{v.value}</strong>{' '}
                        <span className="text-sky-400 font-mono text-[10px]">{v.unit}</span>
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-3 text-center">
                  {r.hasEvidence ? (
                    <span className="inline-flex items-center space-x-1 text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2 py-0.5 rounded">
                      <FileText className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold font-mono">Attached</span>
                    </span>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1">
        <span>
          Partition: WaterReadings#{sourceId} &bull; Ward {String(wardNumber).padStart(2, '0')}
          {sourceName ? ` &bull; ${sourceName}` : ''}
        </span>
        <span>Showing {displayReadings.length} chronological sample records</span>
      </div>
    </div>
  );
};

export default ChronologicalSamplesTable;
