export type Portal = 'citizen' | 'admin';

export type Source = {
  sourceId: string;
  name?: string;
  district?: string;
  locality?: string;
  publicStatus?: string;
  lastReadingAt?: string;
  latitude?: number;
  longitude?: number;
  isDemo?: boolean;
  wardNumber?: number;
  zoneName?: string;
  [key: string]: unknown;
};

export type Alert = {
  alertId: string;
  sourceId: string;
  severity?: string;
  state?: string;
  reason?: string;
  publicMessage?: string;
  issuedAt?: string;
  [key: string]: unknown;
};

export type Reading = {
  readingId: string;
  sourceId: string;
  collectedAt?: string;
  receivedAt?: string;
  method?: string;
  verificationStatus?: string;
  parameters?: Record<string, { value: number; unit: string }>;
  isDemo?: boolean;
  [key: string]: unknown;
};

export type ComplaintStatus = 'PENDING' | 'TRIAGED' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
export type ComplaintPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface ComplaintRecord {
  complaintId: string;
  reference: string;
  wardNumber: number;
  sourceId?: string;
  sourceName?: string;
  category: string;
  details: string;
  citizenName?: string;
  citizenPhone?: string;
  citizenEmail?: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  assignedTo?: string;
  resolutionNotes?: string;
  resolvedAt?: string;
  s3Bucket?: string;
  s3Key?: string;
  photoName?: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export type ComplaintPreview = ComplaintRecord;
