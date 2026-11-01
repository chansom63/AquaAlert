import { AlertTriangle, Bell, Info, CheckCircle2 } from 'lucide-react';
import type { ComponentType } from 'react';

export type AlertSeverityLevel = 'critical' | 'high' | 'warning' | 'info' | 'resolved';

export interface AlertSeverityConfig {
  id: AlertSeverityLevel;
  label: string;
  badgeLabel: string;
  hex: string;
  description: string;
  icon: ComponentType<{ className?: string; size?: number | string }>;
  bgHex: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
}

export const ALERT_SEVERITIES: Record<AlertSeverityLevel, AlertSeverityConfig> = {
  critical: {
    id: 'critical',
    label: 'Critical',
    badgeLabel: 'Critical',
    hex: '#DC2626',
    description: 'Dangerously contaminated water, critical thresholds exceeded.',
    icon: AlertTriangle,
    bgHex: '#DC2626',
    badgeBg: 'rgba(220, 38, 38, 0.18)',
    badgeBorder: 'rgba(220, 38, 38, 0.45)',
    badgeText: '#DC2626',
  },
  high: {
    id: 'high',
    label: 'High',
    badgeLabel: 'High',
    hex: '#EA580C',
    description: 'Serious water-quality deviation requiring prompt attention.',
    icon: AlertTriangle,
    bgHex: '#EA580C',
    badgeBg: 'rgba(234, 88, 12, 0.18)',
    badgeBorder: 'rgba(234, 88, 12, 0.45)',
    badgeText: '#EA580C',
  },
  warning: {
    id: 'warning',
    label: 'Warning',
    badgeLabel: 'Warning',
    hex: '#CA8A04',
    description: 'An unusual reading or a parameter approaching its limit.',
    icon: Bell,
    bgHex: '#CA8A04',
    badgeBg: 'rgba(202, 138, 4, 0.18)',
    badgeBorder: 'rgba(202, 138, 4, 0.45)',
    badgeText: '#CA8A04',
  },
  info: {
    id: 'info',
    label: 'Information',
    badgeLabel: 'Info',
    hex: '#167D9A',
    description: 'Routine updates, sensor status, and informational notifications.',
    icon: Info,
    bgHex: '#167D9A',
    badgeBg: 'rgba(22, 125, 154, 0.18)',
    badgeBorder: 'rgba(22, 125, 154, 0.45)',
    badgeText: '#167D9A',
  },
  resolved: {
    id: 'resolved',
    label: 'Safe / Resolved',
    badgeLabel: 'Resolved',
    hex: '#15803D',
    description: 'Water readings within defined limits or an alert has been resolved.',
    icon: CheckCircle2,
    bgHex: '#15803D',
    badgeBg: 'rgba(21, 128, 61, 0.18)',
    badgeBorder: 'rgba(21, 128, 61, 0.45)',
    badgeText: '#15803D',
  },
};

export function getAlertSeverity(severityStr?: string, stateStr?: string): AlertSeverityConfig {
  if (stateStr?.toUpperCase() === 'RESOLVED' || stateStr?.toUpperCase() === 'CLOSED') {
    return ALERT_SEVERITIES.resolved;
  }
  const s = (severityStr || '').toUpperCase();
  if (s === 'CRITICAL' || s === 'DANGER' || s === 'SEVERE') return ALERT_SEVERITIES.critical;
  if (s === 'HIGH' || s === 'BOIL_WATER' || s === 'ATTENTION' || s === 'ALERT') return ALERT_SEVERITIES.high;
  if (s === 'WARNING' || s === 'WARN' || s === 'SCREENING' || s === 'ADVISORY') return ALERT_SEVERITIES.warning;
  if (s === 'RESOLVED' || s === 'SAFE' || s === 'NORMAL' || s === 'OPTIMAL') return ALERT_SEVERITIES.resolved;
  return ALERT_SEVERITIES.info;
}
