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

export type ComplaintPreview = {
  reference: string;
  category: string;
  wardNumber: number;
  details: string;
  photoName?: string;
  createdAt: string;
};
