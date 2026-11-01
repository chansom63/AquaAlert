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

export const DEMO_ALERTS: Alert[] = GWALIOR_WARDS_66.filter(w => w.status === 'ATTENTION').map(w => ({
  alertId: `demo-ward-${String(w.wardNumber).padStart(2, '0')}`,
  sourceId: `gmc-ward-${String(w.wardNumber).padStart(2, '0')}`,
  severity: 'SCREENING',
  state: 'REVIEW',
  reason: 'Illustrative ward screening status from the local Gwalior demo dataset.',
  publicMessage: 'Precautionary screening notice — consult official municipal guidance.',
  isDemo: true,
}));
