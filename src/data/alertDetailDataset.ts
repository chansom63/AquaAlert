import type { Alert, Source } from '../types/water';

export interface AlertAuditAction {
  actionKey: string;
  actionType: string;
  fromState?: string;
  toState?: string;
  summary: string;
  reason?: string;
  publicNote?: string;
  evidenceObjectKey?: string;
  advisoryMessage?: string;
  actorRole: string;
  actorName?: string;
  createdAt: string;
}

export interface AlertThresholdInfo {
  parameter: string;
  operator: string;
  limit: number;
  unit: string;
  measuredValue: number;
  standardName: string;
}

export interface AlertDetailRecord {
  alertId: string;
  sourceId: string;
  severity: string;
  state: string;
  publicationStatus: 'PUBLISHED' | 'DRAFT' | 'INTERNAL_ONLY';
  advisoryStatus: 'ADVISORY_APPROVED' | 'PENDING_REVIEW' | 'NONE';
  notificationStatus: 'SENT_TO_SNS' | 'DELIVERED' | 'FAILED' | 'PENDING' | 'RETRY_PENDING';
  notificationAttempts: number;
  notificationErrorCategory?: string;
  isDemo?: boolean;
  reason: string;
  publicMessage?: string;
  advisoryMessage?: string;
  updatedAt: string;
  repeatCount: number;
  readingId: string;
  threshold: AlertThresholdInfo;
  timeline: AlertAuditAction[];
}

export const INITIAL_ALERT_DETAILS: Record<string, AlertDetailRecord> = {
  'alert-gwl-crit-01': {
    alertId: 'alert-gwl-crit-01',
    sourceId: 'gmc-ward-14',
    severity: 'CRITICAL',
    state: 'OPEN',
    publicationStatus: 'PUBLISHED',
    advisoryStatus: 'ADVISORY_APPROVED',
    notificationStatus: 'SENT_TO_SNS',
    notificationAttempts: 1,
    isDemo: true,
    reason: 'Dangerously contaminated water detected; critical TDS (>780 mg/L) & turbidity thresholds exceeded.',
    publicMessage: 'Critical Water Quality Alert — Immediate Boil-Water Advisory in Maharaj Bada Sector.',
    advisoryMessage: 'Immediate Boil-Water Advisory in Maharaj Bada Sector. Do not consume raw tap water without rolling boil of 3+ minutes.',
    updatedAt: '2026-10-31T08:15:00Z',
    repeatCount: 3,
    readingId: 'gwl-sm-104',
    threshold: {
      parameter: 'Total Dissolved Solids (TDS)',
      operator: '>',
      limit: 500,
      unit: 'mg/L',
      measuredValue: 780,
      standardName: 'BIS IS 10500:2012 Drinking Water Specification',
    },
    timeline: [
      {
        actionKey: 'act-001',
        actionType: 'FIELD_INGESTION',
        fromState: '',
        toState: 'OPEN',
        summary: 'Automated telemetry sensor gateway ingested parameter readings exceeding critical ceiling.',
        reason: 'Automated ingestion trigger: TDS measured 780 mg/L (permissible limit <= 500 mg/L).',
        actorRole: 'SYSTEM',
        actorName: 'GMC IoT Telemetry Daemon #04',
        createdAt: '2026-10-31T08:15:00Z',
      },
      {
        actionKey: 'act-002',
        actionType: 'NOTIFICATION_DISPATCH',
        fromState: 'OPEN',
        toState: 'OPEN',
        summary: 'AWS SNS SMS/Email notification dispatched to on-call zonal sanitarians and municipal executive.',
        reason: 'Priority escalation rule fired: CRITICAL severity incident.',
        actorRole: 'SYSTEM',
        actorName: 'AWS SNS Topic [gmc-water-incidents-critical]',
        createdAt: '2026-10-31T08:16:12Z',
      },
      {
        actionKey: 'act-003',
        actionType: 'OFFICIAL_ADVISORY_APPROVED',
        fromState: 'OPEN',
        toState: 'OPEN',
        summary: 'Chief Municipal Health Officer reviewed and approved precautionary boil-water advisory for Ward 14.',
        reason: 'High pedestrian and commercial footfall in Maharaj Bada market complex warrants swift public protection notice.',
        publicNote: 'Citizens advised to boil all drinking water for minimum 3 minutes until flushing completes.',
        advisoryMessage: 'Immediate Boil-Water Advisory in Maharaj Bada Sector. Do not consume raw tap water without rolling boil of 3+ minutes.',
        evidenceObjectKey: 'evidence/gwl-ward14-emergency-notice.pdf',
        actorRole: 'ADMIN',
        actorName: 'Dr. V. K. Saxena (CMHO Gwalior)',
        createdAt: '2026-10-31T08:45:00Z',
      },
    ],
  },
  'alert-gwl-high-02': {
    alertId: 'alert-gwl-high-02',
    sourceId: 'gmc-ward-28',
    severity: 'HIGH',
    state: 'INVESTIGATING',
    publicationStatus: 'PUBLISHED',
    advisoryStatus: 'ADVISORY_APPROVED',
    notificationStatus: 'SENT_TO_SNS',
    notificationAttempts: 2,
    isDemo: true,
    reason: 'Serious water-quality deviation requiring prompt attention; low residual chlorine (0.08 mg/L).',
    publicMessage: 'High Priority Advisory — Precautionary boil-water directive active during main flush.',
    advisoryMessage: 'Precautionary boil-water directive active during main pipeline flushing and chlorination adjustment.',
    updatedAt: '2026-10-30T14:30:00Z',
    repeatCount: 1,
    readingId: 'gwl-sm-089',
    threshold: {
      parameter: 'Free Residual Chlorine',
      operator: '<',
      limit: 0.2,
      unit: 'mg/L',
      measuredValue: 0.08,
      standardName: 'BIS IS 10500:2012 Drinking Water Specification (Min 0.2 mg/L)',
    },
    timeline: [
      {
        actionKey: 'act-010',
        actionType: 'FIELD_INGESTION',
        fromState: '',
        toState: 'OPEN',
        summary: 'Colorimetric field probe detected sub-standard chlorine dosage at distribution outlet.',
        reason: 'Residual chlorine 0.08 mg/L below minimum bactericidal threshold of 0.20 mg/L.',
        actorRole: 'FIELD_OPERATOR',
        actorName: 'Sunil Verma (Zone 8 Operator)',
        createdAt: '2026-10-30T14:30:00Z',
      },
      {
        actionKey: 'act-011',
        actionType: 'ACKNOWLEDGEMENT',
        fromState: 'OPEN',
        toState: 'ACKNOWLEDGED',
        summary: 'Control room engineer logged incident and initiated chlorination dosing pump verification.',
        reason: 'Inspection protocol initiated to prevent microbial resurgence in downstream conduits.',
        actorRole: 'REVIEWER',
        actorName: 'Priya Joshi (Water Quality Analyst)',
        createdAt: '2026-10-30T14:55:00Z',
      },
      {
        actionKey: 'act-012',
        actionType: 'INVESTIGATION',
        fromState: 'ACKNOWLEDGED',
        toState: 'INVESTIGATING',
        summary: 'Mobile technical van dispatched to Thatipur booster station; chlorinator feed nozzle serviced.',
        reason: 'Feed nozzle blockage cleared; booster pump dosing re-calibrated to 0.45 mg/L.',
        evidenceObjectKey: 'evidence/thatipur-chlorinator-service.pdf',
        publicNote: 'Pipeline flush underway; chlorine levels restoring to normal parameters.',
        actorRole: 'FIELD_OPERATOR',
        actorName: 'M. K. Tomar (Maintenance Unit 4)',
        createdAt: '2026-10-30T16:20:00Z',
      },
    ],
  },
  'alert-gwl-warn-03': {
    alertId: 'alert-gwl-warn-03',
    sourceId: 'gmc-ward-07',
    severity: 'WARNING',
    state: 'INVESTIGATING',
    publicationStatus: 'PUBLISHED',
    advisoryStatus: 'NONE',
    notificationStatus: 'SENT_TO_SNS',
    notificationAttempts: 1,
    isDemo: true,
    reason: 'An unusual reading: turbidity approaching upper permissible limit (0.95 NTU).',
    publicMessage: 'Water Quality Warning — Elevated turbidity detected in feeder distribution branch.',
    updatedAt: '2026-10-29T11:00:00Z',
    repeatCount: 0,
    readingId: 'gwl-sm-067',
    threshold: {
      parameter: 'Turbidity',
      operator: '>',
      limit: 0.5,
      unit: 'NTU',
      measuredValue: 0.95,
      standardName: 'BIS IS 10500:2012 (Desirable: 1.0 NTU, Feeder threshold: 0.5 NTU)',
    },
    timeline: [
      {
        actionKey: 'act-020',
        actionType: 'FIELD_INGESTION',
        fromState: '',
        toState: 'OPEN',
        summary: 'Turbidimeter recorded 0.95 NTU in branch pipeline following reservoir gate flow surge.',
        reason: 'Turbidity level trending above baseline 0.35 NTU.',
        actorRole: 'SYSTEM',
        actorName: 'Tigra Dam Distribution SCADA',
        createdAt: '2026-10-29T11:00:00Z',
      },
      {
        actionKey: 'act-021',
        actionType: 'ACKNOWLEDGEMENT',
        fromState: 'OPEN',
        toState: 'INVESTIGATING',
        summary: 'Continuous monitoring filter valve backwashed; sedimentation baseline stabilized.',
        actorRole: 'REVIEWER',
        actorName: 'A. K. Mishra (Telemetry Desk)',
        createdAt: '2026-10-29T12:30:00Z',
      },
    ],
  },
  'alert-gwl-info-04': {
    alertId: 'alert-gwl-info-04',
    sourceId: 'gmc-ward-40',
    severity: 'INFO',
    state: 'OPEN',
    publicationStatus: 'PUBLISHED',
    advisoryStatus: 'NONE',
    notificationStatus: 'SENT_TO_SNS',
    notificationAttempts: 1,
    isDemo: true,
    reason: 'Routine updates, sensor recalibration, and scheduled quarterly telemetry network check.',
    publicMessage: 'Informational Notice — Gandhi Nagar WTP telemetry online, no disruption to supply.',
    updatedAt: '2026-10-28T09:00:00Z',
    repeatCount: 0,
    readingId: 'gwl-sm-041',
    threshold: {
      parameter: 'Telemetry System Recalibration',
      operator: '=',
      limit: 100,
      unit: '% verified',
      measuredValue: 100,
      standardName: 'GMC Quarterly Telemetry Audit Protocol',
    },
    timeline: [
      {
        actionKey: 'act-030',
        actionType: 'FIELD_INGESTION',
        fromState: '',
        toState: 'OPEN',
        summary: 'Diagnostic routine verified sensor telemetry drift correction across all Gandhi Nagar conduits.',
        reason: 'Quarterly sensor recalibration routine completed successfully.',
        actorRole: 'SYSTEM',
        actorName: 'Gandhi Nagar WTP RTU-02',
        createdAt: '2026-10-28T09:00:00Z',
      },
    ],
  },
  'alert-gwl-res-05': {
    alertId: 'alert-gwl-res-05',
    sourceId: 'gmc-ward-16',
    severity: 'RESOLVED',
    state: 'RESOLVED',
    publicationStatus: 'PUBLISHED',
    advisoryStatus: 'NONE',
    notificationStatus: 'DELIVERED',
    notificationAttempts: 1,
    isDemo: true,
    reason: 'Water readings returned strictly within BIS IS 10500 limits following conduit decontamination.',
    publicMessage: 'Alert Resolved — Jayendraganj commercial pipeline cleared; water certified potable.',
    updatedAt: '2026-10-27T16:45:00Z',
    repeatCount: 2,
    readingId: 'gwl-sm-022',
    threshold: {
      parameter: 'Microbial & Chemical Potability Verification',
      operator: '<=',
      limit: 1.0,
      unit: 'BIS Potable Compliance Index',
      measuredValue: 0.2,
      standardName: 'BIS IS 10500:2012 Certified Lab Potability',
    },
    timeline: [
      {
        actionKey: 'act-040',
        actionType: 'FIELD_INGESTION',
        fromState: '',
        toState: 'OPEN',
        summary: 'Initial microbial screening anomaly flagged coliform indicator presence.',
        reason: 'Routine pre-festival inspection detected anomaly.',
        actorRole: 'FIELD_OPERATOR',
        actorName: 'R. K. Gupta (Zonal Inspector)',
        createdAt: '2026-10-25T09:00:00Z',
      },
      {
        actionKey: 'act-041',
        actionType: 'INVESTIGATION',
        fromState: 'OPEN',
        toState: 'PENDING_LAB',
        summary: 'Conduit isolated and high-velocity chlorine scour flush administered for 4 hours.',
        reason: 'Disinfection protocol executed; duplicate samples sent to central laboratory.',
        evidenceObjectKey: 'evidence/jayendraganj-flush-report.pdf',
        actorRole: 'FIELD_OPERATOR',
        actorName: 'S. P. Singh (Pipeline Engineer)',
        createdAt: '2026-10-26T14:15:00Z',
      },
      {
        actionKey: 'act-042',
        actionType: 'RESOLUTION',
        fromState: 'PENDING_LAB',
        toState: 'RESOLVED',
        summary: 'Central Public Health Engineering Lab certified water safe and fully potable.',
        reason: 'Zero coliform CFU/100mL, residual chlorine 0.42 mg/L, TDS 280 mg/L.',
        publicNote: 'Jayendraganj pipeline cleared and certified safe for domestic consumption.',
        evidenceObjectKey: 'evidence/jayendraganj-lab-certificate.pdf',
        actorRole: 'REVIEWER',
        actorName: 'Dr. Anita Roy (Chief Lab Microbiologist)',
        createdAt: '2026-10-27T16:45:00Z',
      },
    ],
  },
};

// In-memory action storage for the session
const sessionActions: Record<string, AlertAuditAction[]> = {};

export function getAlertDetail(alertId: string, alert?: Alert, source?: Source): AlertDetailRecord {
  const existing = INITIAL_ALERT_DETAILS[alertId];
  const dynamicTimeline = sessionActions[alertId] || [];

  if (existing) {
    return {
      ...existing,
      timeline: [...existing.timeline, ...dynamicTimeline],
    };
  }

  // Fallback generator for any ward alert
  const baseSeverity = alert?.severity || 'HIGH';
  const baseState = alert?.state || 'OPEN';

  return {
    alertId,
    sourceId: alert?.sourceId || source?.sourceId || 'gmc-ward-01',
    severity: baseSeverity,
    state: baseState,
    publicationStatus: 'PUBLISHED',
    advisoryStatus: baseSeverity === 'CRITICAL' ? 'ADVISORY_APPROVED' : 'NONE',
    notificationStatus: 'SENT_TO_SNS',
    notificationAttempts: 1,
    isDemo: true,
    reason: alert?.reason || `Parameter threshold deviation detected at ${source?.name || alertId}.`,
    publicMessage: alert?.publicMessage || `Precautionary water advisory for ${source?.name || alertId}.`,
    updatedAt: alert?.issuedAt || new Date().toISOString(),
    repeatCount: 1,
    readingId: `gwl-sm-${alertId.replace(/\D/g, '') || '101'}`,
    threshold: {
      parameter: 'Total Dissolved Solids (TDS)',
      operator: '>',
      limit: 500,
      unit: 'mg/L',
      measuredValue: baseSeverity === 'CRITICAL' ? 760 : 610,
      standardName: 'BIS IS 10500:2012 Drinking Water Specification',
    },
    timeline: [
      {
        actionKey: `init-${alertId}`,
        actionType: 'FIELD_INGESTION',
        fromState: '',
        toState: 'OPEN',
        summary: `Screening parameter captured by municipal sampling kit at ${source?.name || alertId}.`,
        reason: 'Automated ingestion trigger on parameter threshold breach.',
        actorRole: 'FIELD_OPERATOR',
        actorName: 'GMC Zonal Sanitary Inspector',
        createdAt: alert?.issuedAt || new Date().toISOString(),
      },
      ...dynamicTimeline,
    ],
  };
}

export function appendAlertAction(alertId: string, action: AlertAuditAction): void {
  if (!sessionActions[alertId]) {
    sessionActions[alertId] = [];
  }
  sessionActions[alertId].push(action);
}
