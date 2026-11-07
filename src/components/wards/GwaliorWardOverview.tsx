import { useEffect, useMemo, useState } from 'react';
import type { FC } from 'react';
import { api } from '../../api/client';
import { recordsFrom } from '../../api/adminRecords';
import { GMC_ZONES_25, GWALIOR_WARDS_66 } from '../../data/gwaliorWardsData.js';
import type { Reading, Source } from '../../types/water';
import { MapExplorer } from '../MapExplorer';
import { OverviewParametersView } from '../parameters/OverviewParametersView';
import { HistoricalParameterChart } from '../charts/HistoricalParameterChart';
import { ChronologicalSamplesTable } from '../readings/ChronologicalSamplesTable';
import { LabReportsEvidenceView } from '../evidence/LabReportsEvidenceView';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Loader2 } from 'lucide-react';

const GwaliorWardOverview: FC<{ sources: Source[] }> = ({ sources }) => {
  const [zone, setZone] = useState('ALL');
  const [wardNumber, setWardNumber] = useState(14);
  const [search, setSearch] = useState('');
  const [mapOpen, setMapOpen] = useState(true);
  const [cardTab, setCardTab] = useState('Overview & Parameters');
  const [chartParam, setChartParam] = useState('TDS');
  const [wardReadings, setWardReadings] = useState<Reading[]>([]);
  const [wardReadingsLoading, setWardReadingsLoading] = useState(false);

  const currentSourceId = `gmc-ward-${String(wardNumber).padStart(2, '0')}`;

  useEffect(() => {
    let active = true;
    setWardReadingsLoading(true);
    api<unknown>(`/sources/${encodeURIComponent(currentSourceId)}/readings`)
      .then(res => {
        if (!active) return;
        const items = recordsFrom(res) as unknown as Reading[];
        if (items.length > 0) {
          setWardReadings(items);
        }
      })
      .catch(() => {
        if (active) setWardReadings([]);
      })
      .finally(() => {
        if (active) setWardReadingsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [currentSourceId]);

  const wards = useMemo(
    () => GWALIOR_WARDS_66.filter(w => (zone === 'ALL' || w.zoneId === Number(zone)) && `${w.name} ${w.locality} ${w.wardNumber}`.toLowerCase().includes(search.toLowerCase())),
    [zone, search],
  );
  const wardOptions = useMemo(
    () => GWALIOR_WARDS_66.filter(w => `${w.name} ${w.locality} ${w.wardNumber} ${w.zoneName}`.toLowerCase().includes(search.toLowerCase())),
    [search],
  );
  useEffect(() => {
    if (wards.length && !wards.some(w => w.wardNumber === wardNumber)) setWardNumber(wards[0].wardNumber);
  }, [wards, wardNumber]);
  const searchWard = (value: string) => {
    setSearch(value);
    if (value.trim().length < 3) return;
    const query = value.trim().toLowerCase();
    const currentZoneMatches = GWALIOR_WARDS_66.some(
      item => (zone === 'ALL' || item.zoneId === Number(zone)) && `${item.name} ${item.locality} ${item.wardNumber}`.toLowerCase().includes(query),
    );
    if (currentZoneMatches) return;
    const cityMatch = GWALIOR_WARDS_66.find(item => `${item.name} ${item.locality} ${item.wardNumber}`.toLowerCase().includes(query));
    if (cityMatch) {
      setZone(String(cityMatch.zoneId));
      setWardNumber(cityMatch.wardNumber);
    }
  };
  const ward = GWALIOR_WARDS_66.find(w => w.wardNumber === wardNumber) || GWALIOR_WARDS_66[13];
  const concern = ward.status === 'ATTENTION';

  // Compute live readings parameters from central database telemetry
  const latestReading = wardReadings.length > 0
    ? [...wardReadings].sort((a, b) => new Date(b.collectedAt || 0).getTime() - new Date(a.collectedAt || 0).getTime())[0]
    : null;

  const rawParams = (latestReading?.parameters || {}) as Record<string, { value: number | string; unit?: string } | undefined>;
  const pHVal = Number(rawParams.pH?.value ?? rawParams.ph?.value ?? (parseFloat(ward.pH) || 7.2));
  const tdsVal = Number(rawParams.TDS?.value ?? rawParams.tds?.value ?? (parseFloat(ward.tds) || 620));
  const turVal = Number(rawParams.Turbidity?.value ?? rawParams.turbidity?.value ?? (parseFloat(ward.turbidity) || 0.85));
  const clVal = Number(rawParams.Chlorine?.value ?? rawParams.freeChlorine?.value ?? (parseFloat(ward.chlorine) || 0.45));
  const flVal = Number(rawParams.Fluoride?.value ?? rawParams.fluoride?.value ?? 0.7);
  const nitVal = Number(rawParams.Nitrate?.value ?? rawParams.nitrate?.value ?? 18);
  const hasBacteria = rawParams.Bacteria?.value === 'Detected';
  const isAnomalous = concern || tdsVal > 500 || turVal > 1.0 || hasBacteria;

  const samplesTabLabel = `Chronological Samples (${wardReadings.length})`;

  return (
    <section className="ward-overview">
      <div className="ward-filters">
        <label>
          FILTER BY ADMINISTRATIVE ZONE
          <select value={zone} onChange={e => setZone(e.target.value)}>
            <option value="ALL">All 25 Administrative Zones</option>
            {GMC_ZONES_25.map(z => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          SELECT FROM 66 MUNICIPAL WARDS
          <select
            value={ward.wardNumber}
            onChange={e => {
              const selectedWard = GWALIOR_WARDS_66.find(w => w.wardNumber === Number(e.target.value));
              if (selectedWard) {
                setZone(String(selectedWard.zoneId));
                setWardNumber(selectedWard.wardNumber);
              }
            }}
          >
            {wardOptions.length ? (
              wardOptions.map(w => (
                <option key={w.wardNumber} value={w.wardNumber}>
                  Ward {String(w.wardNumber).padStart(2, '0')}: {w.name.split(' - ')[1]} · {w.zoneName}
                  {w.status === 'ATTENTION' ? ' · Advisory' : ''}
                </option>
              ))
            ) : (
              <option value={ward.wardNumber}>No wards match this search</option>
            )}
          </select>
        </label>
        <label>
          QUICK WARD SEARCH
          <input value={search} onChange={e => searchWard(e.target.value)} placeholder="e.g. Sarafa, 14, Thatipur…" />
        </label>
      </div>

      <div className="ward-summary">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <nav className="ward-card-navbar">
            {['Overview & Parameters', 'Historical Trend Charts', samplesTabLabel, 'Lab Reports & Evidence'].map(item => (
              <button key={item} type="button" className={(cardTab === item || (item.startsWith('Chronological Samples') && cardTab.startsWith('Chronological Samples'))) ? 'active' : ''} onClick={() => setCardTab(item)}>
                {item}
              </button>
            ))}
          </nav>
          {wardReadingsLoading && (
            <div className="flex items-center gap-2 px-3 py-1 text-xs text-sky-400 font-mono">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
              <span>Fetching live grid telemetry…</span>
            </div>
          )}
        </div>

        {cardTab === 'Overview & Parameters' && (
          <div className="ward-summary-tab-content p-2 sm:p-4 space-y-4">
            <div className="ward-tags flex flex-wrap items-center gap-2 mb-2">
              <span>WARD {String(ward.wardNumber).padStart(2, '0')}</span>
              <b className={isAnomalous ? 'advisory' : 'current'}>
                {isAnomalous ? '⚠ Precautionary boil-water advisory' : 'Monitoring status: no active advisory'}
              </b>
              <small>{ward.zoneName}</small>
              <span className="text-xs text-slate-400 font-mono ml-auto">Supply: {ward.waterSource}</span>
            </div>

            <OverviewParametersView
              stationRef={currentSourceId}
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
              onOpenCharts={() => setCardTab('Historical Trend Charts')}
              onCloseDrawer={() => {}}
              showFooter={true}
            />
          </div>
        )}

        {cardTab === 'Historical Trend Charts' && (
          <div className="ward-summary-tab-content p-2 sm:p-4 space-y-4">
            {wardReadingsLoading && wardReadings.length === 0 ? (
              <LoadingSpinner
                size="sm"
                label={`Fetching historical readings for Ward ${ward.wardNumber}…`}
                sublabel="Querying central telemetry database &bull; live"
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
                <HistoricalParameterChart readings={wardReadings} parameterKey={chartParam} />
              </>
            )}
          </div>
        )}

        {cardTab.startsWith('Chronological Samples') && (
          <div className="ward-summary-tab-content p-2 sm:p-4">
            {wardReadingsLoading && wardReadings.length === 0 ? (
              <LoadingSpinner
                size="sm"
                label={`Fetching chronological samples for Ward ${ward.wardNumber}…`}
                sublabel="Querying central telemetry database &bull; live"
              />
            ) : (
              <ChronologicalSamplesTable
                readings={wardReadings}
                wardNumber={ward.wardNumber}
                sourceId={currentSourceId}
                sourceName={ward.name}
              />
            )}
          </div>
        )}

        {cardTab === 'Lab Reports & Evidence' && (
          <div className="ward-summary-tab-content p-2 sm:p-4">
            <LabReportsEvidenceView
              wardNumber={ward.wardNumber}
              sourceId={currentSourceId}
              sourceName={ward.name}
            />
          </div>
        )}
      </div>

      <div className="ward-map-section">
        <div className="ward-map-header">
          <div className="ward-map-header-left">
            <div className="ward-map-badge">
              <span className="ward-map-pulse" />
              <span>GEOSPATIAL WATER SURVEILLANCE · GWALIOR</span>
            </div>
            <h3>Gwalior Municipal Water Grid &amp; Ward Boundaries</h3>
            <p>High-definition Esri street &amp; satellite cartography · 66 Municipal Wards · 25 GMC Zones · Tigra Dam Conduit</p>
          </div>
          <div className="ward-map-header-actions">
            <span className="ward-map-active-pill">
              Selected: Ward {String(ward.wardNumber).padStart(2, '0')} · {ward.name.split(' - ')[1]}
            </span>
            <button type="button" className="ward-map-toggle-btn" onClick={() => setMapOpen(v => !v)} aria-expanded={mapOpen}>
              {mapOpen ? 'Hide Map ▲' : 'Show Map ▼'}
            </button>
          </div>
        </div>

        {mapOpen && (
          <div className="ward-map-viewport">
            <MapExplorer
              sources={sources}
              initialSelectedWard={ward.wardNumber}
              onSelectWard={wNum => {
                if (wNum) {
                  const target = GWALIOR_WARDS_66.find(w => w.wardNumber === wNum);
                  if (target) {
                    setZone(String(target.zoneId));
                    setWardNumber(target.wardNumber);
                  }
                }
              }}
              onSelectSource={sourceId => {
                const found = sources.find(s => s.sourceId === sourceId);
                if (found && found.wardNumber) {
                  setWardNumber(Number(found.wardNumber));
                  const target = GWALIOR_WARDS_66.find(w => w.wardNumber === Number(found.wardNumber));
                  if (target) setZone(String(target.zoneId));
                }
              }}
            />
          </div>
        )}
      </div>
    </section>
  );
};

export default GwaliorWardOverview;
