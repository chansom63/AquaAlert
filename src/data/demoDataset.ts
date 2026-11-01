import { GWALIOR_WARDS_66 } from './gwaliorWardsData.js';
import type { Alert, Source } from '../types/water';

export const GWALIOR_AREAS = [
  'All areas',
  'Lashkar',
  'Morar',
  'Thatipur',
  'Hazira',
  'City Centre',
  'Gole Ka Mandir',
  'Maharaj Bada',
];

export const DEMO_SOURCES: Source[] = GWALIOR_WARDS_66.map(w => ({
  sourceId: `gmc-ward-${String(w.wardNumber).padStart(2, '0')}`,
  name: w.waterSource,
  district: 'Gwalior',
  locality: w.locality,
  publicStatus: w.status === 'ATTENTION' ? 'ADVISORY' : w.status,
  lastReadingAt: 'Demo sample · date not verified',
  latitude: w.center.lat,
  longitude: w.center.lng,
  isDemo: true,
  wardNumber: w.wardNumber,
  zoneName: w.zoneName,
}));

export const DEMO_ALERTS: Alert[] = [
  {
    alertId: 'alert-gwl-crit-01',
    sourceId: 'gmc-ward-14',
    severity: 'CRITICAL',
    state: 'OPEN',
    reason: 'Dangerously contaminated water detected; critical TDS (>780 mg/L) & turbidity thresholds exceeded.',
    publicMessage: 'Critical Water Quality Alert — Immediate Boil-Water Advisory in Maharaj Bada Sector.',
    issuedAt: '2026-10-31T08:15:00Z',
    isDemo: true,
  },
  {
    alertId: 'alert-gwl-high-02',
    sourceId: 'gmc-ward-28',
    severity: 'HIGH',
    state: 'INVESTIGATION',
    reason: 'Serious water-quality deviation requiring prompt attention; low residual chlorine (0.08 mg/L).',
    publicMessage: 'High Priority Advisory — Precautionary boil-water directive active during main flush.',
    issuedAt: '2026-10-30T14:30:00Z',
    isDemo: true,
  },
  {
    alertId: 'alert-gwl-warn-03',
    sourceId: 'gmc-ward-07',
    severity: 'WARNING',
    state: 'MONITORING',
    reason: 'An unusual reading: turbidity approaching upper permissible limit (0.95 NTU).',
    publicMessage: 'Water Quality Warning — Elevated turbidity detected in feeder distribution branch.',
    issuedAt: '2026-10-29T11:00:00Z',
    isDemo: true,
  },
  {
    alertId: 'alert-gwl-info-04',
    sourceId: 'gmc-ward-40',
    severity: 'INFO',
    state: 'ACTIVE',
    reason: 'Routine updates, sensor recalibration, and scheduled quarterly telemetry network check.',
    publicMessage: 'Informational Notice — Gandhi Nagar WTP telemetry online, no disruption to supply.',
    issuedAt: '2026-10-28T09:00:00Z',
    isDemo: true,
  },
  {
    alertId: 'alert-gwl-res-05',
    sourceId: 'gmc-ward-16',
    severity: 'RESOLVED',
    state: 'RESOLVED',
    reason: 'Water readings returned strictly within BIS IS 10500 limits following conduit decontamination.',
    publicMessage: 'Alert Resolved — Jayendraganj commercial pipeline cleared; water certified potable.',
    issuedAt: '2026-10-27T16:45:00Z',
    isDemo: true,
  },
  ...GWALIOR_WARDS_66.filter(w => w.status === 'ATTENTION' && w.wardNumber !== 14 && w.wardNumber !== 28).map((w, i) => ({
    alertId: `demo-ward-${String(w.wardNumber).padStart(2, '0')}`,
    sourceId: `gmc-ward-${String(w.wardNumber).padStart(2, '0')}`,
    severity: i % 2 === 0 ? 'HIGH' : 'WARNING',
    state: 'REVIEW',
    reason: `Field screening parameter deviation recorded in ${w.name} (${w.waterSource}).`,
    publicMessage: `Precautionary screening advisory for Ward ${w.wardNumber} (${w.locality}).`,
    issuedAt: '2026-10-26T10:00:00Z',
    isDemo: true,
  }))
];
