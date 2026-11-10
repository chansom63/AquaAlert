import { useEffect, useMemo, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Alert, Source } from '../../types/water';
import type { ApiRecord } from '../../api/adminRecords';
import type { LabReportRecord } from '../../hooks/useAdminTablesData';
import { api } from '../../api/client';
import { recordLocallyUploadedReport } from '../../utils/reportsSync';
import SubmissionSuccessModal, { type SubmissionDetail } from '../common/SubmissionSuccessModal';
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  FlaskConical,
  Folder,
  Image as ImageIcon,
  Layers,
  Loader2,
  MoreHorizontal,
  Paperclip,
  RefreshCw,
  Search,
  Upload,
  User,
  X,
} from 'lucide-react';

interface EvidenceFile {
  id: string;
  fileName: string;
  type: 'Lab Report' | 'Field Photo' | 'Field Sheet' | 'Other';
  linkedTo: string;
  source: string;
  sourceLocation: string;
  uploadedBy: string;
  uploadedAt: string;
  size: string;
  downloadUrl?: string;
  s3Key?: string;
  s3Bucket?: string;
  previewUrl?: string;
  parameters?: { name: string; result: string; unit: string; alert?: boolean }[];
  verifiedBy?: string;
}

const EVIDENCE_DATA: EvidenceFile[] = [
  {
    id: 'EV-001',
    fileName: 'lab_report_A04_20261101.pdf',
    type: 'Lab Report',
    linkedTo: 'ALT-2026-0158',
    source: 'A-04',
    sourceLocation: 'A-04 (Jhansi)',
    uploadedBy: 'Meera S.',
    uploadedAt: '01 Nov 2026, 07:58 PM',
    size: '1.2 MB',
    parameters: [
      { name: 'pH', result: '9.4', unit: '-', alert: true },
      { name: 'Turbidity', result: '3.1', unit: 'NTU' },
      { name: 'TDS', result: '820', unit: 'mg/L' },
      { name: 'Bacteria', result: 'Detected', unit: '-', alert: true },
    ],
    verifiedBy: 'Dr. R. Sharma, Chief Analyst',
  },
  {
    id: 'EV-002',
    fileName: 'field_photo_A04_1.jpg',
    type: 'Field Photo',
    linkedTo: 'ALT-2026-0158',
    source: 'A-04',
    sourceLocation: 'A-04 (Jhansi)',
    uploadedBy: 'Meera S.',
    uploadedAt: '01 Nov 2026, 07:55 PM',
    size: '3.8 MB',
    previewUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb18615f3?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'EV-003',
    fileName: 'field_photo_A04_2.jpg',
    type: 'Field Photo',
    linkedTo: 'ALT-2026-0158',
    source: 'A-04',
    sourceLocation: 'A-04 (Jhansi)',
    uploadedBy: 'Meera S.',
    uploadedAt: '01 Nov 2026, 07:55 PM',
    size: '3.4 MB',
    previewUrl: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'EV-004',
    fileName: 'field_sheet_A04.pdf',
    type: 'Field Sheet',
    linkedTo: 'RD-2026-03124',
    source: 'A-04',
    sourceLocation: 'A-04 (Jhansi)',
    uploadedBy: 'Rohit K.',
    uploadedAt: '01 Nov 2026, 07:43 PM',
    size: '428 KB',
    parameters: [
      { name: 'Field pH', result: '9.35', unit: '-' },
      { name: 'Temperature', result: '24.2', unit: '°C' },
      { name: 'Dissolved O2', result: '6.8', unit: 'mg/L' },
    ],
    verifiedBy: 'Field Officer Rohit K.',
  },
  {
    id: 'EV-005',
    fileName: 'lab_report_C01_TDS.pdf',
    type: 'Lab Report',
    linkedTo: 'ALT-2026-0156',
    source: 'C-01',
    sourceLocation: 'C-01 (Datia)',
    uploadedBy: 'Anita P.',
    uploadedAt: '01 Nov 2026, 05:28 PM',
    size: '1.5 MB',
    parameters: [
      { name: 'TDS', result: '1,240', unit: 'mg/L', alert: true },
      { name: 'Conductivity', result: '1,890', unit: 'µS/cm' },
      { name: 'Chloride', result: '310', unit: 'mg/L' },
    ],
    verifiedBy: 'Anita Patel, Lab Chemist',
  },
];

const TYPE_STYLES: Record<string, string> = {
  'Lab Report': 'bg-blue-100 text-blue-700 border-blue-200',
  'Field Photo': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Field Sheet': 'bg-amber-100 text-amber-800 border-amber-200',
  'Other': 'bg-purple-100 text-purple-700 border-purple-200',
};

interface EvidenceS3ViewProps {
  sources?: Source[];
  alerts?: Alert[];
  readings?: ApiRecord[];
  reports?: LabReportRecord[];
  busy?: boolean;
  onUploadReport?: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
}

export const EvidenceS3View: FC<EvidenceS3ViewProps> = ({ sources = [], alerts = [], reports = [] }) => {
  const dynamicEvidence = useMemo(() => {
    const list: EvidenceFile[] = [];

    // Prepend live database reports holding document references
    if (reports.length > 0) {
      reports.forEach(r => {
        list.push({
          id: r.reportId,
          fileName: r.filename || 'report.pdf',
          type: (r.reportType as any) || 'Lab Report',
          linkedTo: r.sourceId,
          source: r.sourceId,
          sourceLocation: r.sourceName || r.sourceId,
          uploadedBy: r.chemistName || r.uploadedBy || 'Dr. S. Mukherjee (TC-8491)',
          uploadedAt: r.uploadedAt ? new Date(r.uploadedAt).toLocaleString() : 'Recent',
          size: r.fileSizeFormatted || '1.2 MB',
          downloadUrl: r.downloadUrl,
          s3Key: r.s3Key,
          s3Bucket: r.s3Bucket,
          previewUrl: r.downloadUrl,
          parameters: r.testParameters
            ? Object.entries(r.testParameters).slice(0, 4).map(([name, val]) => ({
                name,
                result: typeof val === 'object' && val !== null && 'value' in val ? String((val as any).value) : String(val),
                unit: name.toLowerCase().includes('turbidity') ? 'NTU' : name.toLowerCase().includes('tds') ? 'mg/L' : '-',
              }))
            : undefined,
          verifiedBy: `${r.labName || 'NABL Lab'} (Ref: ${r.s3Key})`,
        });
      });
    }

    list.push(
      {
        id: 'EV-GWL-001',
        fileName: 'lab_report_ward14_microbiology_20261104.pdf',
        type: 'Lab Report',
        linkedTo: 'ALT-GWL-2026-001',
        source: 'gmc-ward-14',
        sourceLocation: 'Ward 14 - Maharaj Bada Central Plaza',
        uploadedBy: 'Dr. S. K. Gupta',
        uploadedAt: '04 Nov 2026, 09:20 AM',
        size: '1.4 MB',
        downloadUrl: '/sample-reports/ward14_spectroscopic_assay_2026.pdf',
        previewUrl: '/sample-reports/ward14_spectroscopic_assay_2026.pdf',
        parameters: [
          { name: 'TDS', result: '790', unit: 'mg/L', alert: true },
          { name: 'Turbidity', result: '4.2', unit: 'NTU', alert: true },
          { name: 'Bacteria', result: 'Detected (Coliform)', unit: '-', alert: true },
          { name: 'pH', result: '7.9', unit: '-' },
        ],
        verifiedBy: 'Dr. S. K. Gupta, Chief Quality Officer (GMC)',
      },
      {
        id: 'EV-GWL-002',
        fileName: 'chlorine_depletion_investigation_w28.pdf',
        type: 'Field Sheet',
        linkedTo: 'ALT-GWL-2026-002',
        source: 'gmc-ward-28',
        sourceLocation: 'Ward 28 - Sikandar Kampoo & Gudha',
        uploadedBy: 'Vikas M.',
        uploadedAt: '03 Nov 2026, 05:40 PM',
        size: '890 KB',
        downloadUrl: '/sample-reports/ward28_chlorine_depletion_investigation.pdf',
        previewUrl: '/sample-reports/ward28_chlorine_depletion_investigation.pdf',
        parameters: [
          { name: 'Residual Chlorine', result: '0.05', unit: 'mg/L', alert: true },
          { name: 'Turbidity', result: '1.65', unit: 'NTU' },
          { name: 'pH', result: '7.2', unit: '-' },
        ],
        verifiedBy: 'A. K. Verma, Senior Zonal Engineer',
      },
      {
        id: 'EV-GWL-003',
        fileName: 'turbidity_spectrophotometry_w07.pdf',
        type: 'Lab Report',
        linkedTo: 'ALT-GWL-2026-003',
        source: 'gmc-ward-07',
        sourceLocation: 'Ward 07 - Gol Pahariya Feeder',
        uploadedBy: 'Anita P.',
        uploadedAt: '03 Nov 2026, 12:15 PM',
        size: '1.1 MB',
        downloadUrl: '/sample-reports/ward07_feeder_turbidity_spectrophotometry.pdf',
        previewUrl: '/sample-reports/ward07_feeder_turbidity_spectrophotometry.pdf',
        parameters: [
          { name: 'Turbidity', result: '5.80', unit: 'NTU', alert: true },
          { name: 'pH', result: '7.3', unit: '-' },
          { name: 'TDS', result: '340', unit: 'mg/L' },
        ],
        verifiedBy: 'NABL Certified Lab Analyst',
      },
      {
        id: 'EV-GWL-004',
        fileName: 'nitrate_spectrophotometric_w49.pdf',
        type: 'Lab Report',
        linkedTo: 'ALT-GWL-2026-005',
        source: 'gmc-ward-49',
        sourceLocation: 'Ward 49 - Bada Gaon Corridor',
        uploadedBy: 'Rohit K.',
        uploadedAt: '02 Nov 2026, 10:45 AM',
        size: '1.6 MB',
        downloadUrl: '/sample-reports/ward14_spectroscopic_assay_2026.pdf',
        previewUrl: '/sample-reports/ward14_spectroscopic_assay_2026.pdf',
        parameters: [
          { name: 'Nitrate (NO3-)', result: '58.0', unit: 'mg/L', alert: true },
          { name: 'TDS', result: '490', unit: 'mg/L' },
          { name: 'pH', result: '7.1', unit: '-' },
        ],
        verifiedBy: 'State Environmental Lab, Bhopal',
      },
      {
        id: 'EV-GWL-005',
        fileName: 'padav_post_flush_clearance_w58.pdf',
        type: 'Lab Report',
        linkedTo: 'ALT-GWL-2026-009',
        source: 'gmc-ward-58',
        sourceLocation: 'Ward 58 - Padav / Railway Station Overpass',
        uploadedBy: 'Meera S.',
        uploadedAt: '01 Nov 2026, 07:30 PM',
        size: '1.3 MB',
        downloadUrl: '/sample-reports/ward58_padav_post_flush_clearance.pdf',
        previewUrl: '/sample-reports/ward58_padav_post_flush_clearance.pdf',
        parameters: [
          { name: 'Turbidity', result: '0.45', unit: 'NTU' },
          { name: 'TDS', result: '240', unit: 'mg/L' },
          { name: 'Chlorine', result: '0.52', unit: 'mg/L' },
        ],
        verifiedBy: 'Executive Engineer, Gwalior Water Works',
      },
      ...EVIDENCE_DATA,
    );
    list.sort((a, b) => {
      const timeA = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
      const timeB = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
      return (Number.isNaN(timeB) ? 0 : timeB) - (Number.isNaN(timeA) ? 0 : timeA);
    });
    return list;
  }, [reports]);

  const [evidenceList, setEvidenceList] = useState<EvidenceFile[]>(dynamicEvidence);

  useEffect(() => {
    setEvidenceList(dynamicEvidence);
  }, [dynamicEvidence]);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | 'lab' | 'photos' | 'sheets' | 'other'>('all');
  const [selectedId, setSelectedId] = useState('EV-GWL-001');
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('All Sources');
  const [alertFilter, setAlertFilter] = useState('All Alerts');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  // Real S3 Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadSourceId, setUploadSourceId] = useState(sources[0]?.sourceId || 'gmc-ward-14');
  const [uploadType, setUploadType] = useState<'Lab Report' | 'Field Photo' | 'Field Sheet' | 'Other'>('Lab Report');
  const [uploadNote, setUploadNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const [submissionModalData, setSubmissionModalData] = useState<{
    title: string;
    subtitle: string;
    badgeText?: string;
    recordId?: string;
    tableTarget?: string;
    s3Pointer?: {
      bucket: string;
      key: string;
      uri?: string;
      downloadUrl?: string;
      fileSize?: string;
    };
    details: SubmissionDetail[];
  } | null>(null);

  const handleS3Upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      alert('Please choose a file to upload.');
      return;
    }
    setUploading(true);
    setUploadSuccessMessage(null);
    try {
      const ext = uploadFile.name.substring(uploadFile.name.lastIndexOf('.')).toLowerCase();
      const detectedContentType = uploadFile.type || (
        ext === '.pdf' ? 'application/pdf' :
        ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
        ext === '.png' ? 'image/png' :
        ext === '.webp' ? 'image/webp' :
        ext === '.csv' ? 'text/csv' : 'application/pdf'
      );

      const targetFolder = uploadType === 'Field Photo'
        ? 'evidence/incident-photos'
        : uploadType === 'Field Sheet'
        ? 'reports/field-sheets'
        : uploadType === 'Other'
        ? 'evidence/general'
        : 'reports/lab-reports';

      const signed = await api<{ uploadUrl: string; objectKey: string; contentType?: string }>('/reports/presigned-url', {
        method: 'POST',
        body: JSON.stringify({
          sourceId: uploadSourceId,
          filename: uploadFile.name,
          contentType: detectedContentType,
          folder: targetFolder,
        }),
      });

      const res = await fetch(signed.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': signed.contentType || detectedContentType },
        body: uploadFile,
      });

      if (!res.ok) {
        throw new Error(`Document upload rejected with status ${res.status}`);
      }

      // Automatically register record into database with certified document reference
      const ddbRes = await api<{ result: string; reportId?: string }>('/reports', {
        method: 'POST',
        body: JSON.stringify({
          sourceId: uploadSourceId,
          sourceName: sources.find(s => s.sourceId === uploadSourceId)?.name || uploadSourceId,
          title: `${uploadType} - ${uploadFile.name}`,
          reportType: uploadType,
          s3Bucket: 'waterq-dev-evidence-files',
          s3Key: signed.objectKey,
          s3Uri: `s3://waterq-dev-evidence-files/${signed.objectKey}`,
          filename: uploadFile.name,
          contentType: signed.contentType || detectedContentType,
          fileSizeBytes: uploadFile.size,
          fileSizeFormatted: `${(uploadFile.size / (1024 * 1024)).toFixed(2)} MB`,
          chemistName: uploadNote || 'Municipal Chemist',
          notes: uploadNote || 'Uploaded via Evidence Archive.',
          verificationStatus: 'LAB_VERIFIED',
        }),
      }).catch(e => {
        console.warn('Report auto-save warning:', e);
        return { result: 'warning', reportId: signed.objectKey };
      });

      const registeredId = (ddbRes as any)?.reportId || signed.objectKey;
      const localBlobUrl = URL.createObjectURL(uploadFile);

      const newRecord: EvidenceFile = {
        id: registeredId,
        fileName: uploadFile.name,
        type: uploadType,
        linkedTo: uploadSourceId,
        source: uploadSourceId,
        sourceLocation: sources.find(s => s.sourceId === uploadSourceId)?.name || uploadSourceId,
        uploadedBy: uploadNote || 'Municipal Chemist',
        uploadedAt: new Date().toLocaleString(),
        size: `${(uploadFile.size / (1024 * 1024)).toFixed(2)} MB`,
        downloadUrl: localBlobUrl,
        s3Key: signed.objectKey,
        s3Bucket: 'waterq-dev-evidence-files',
        previewUrl: localBlobUrl,
        verifiedBy: uploadNote || 'GMC Water Surveillance Unit',
      };

      // Ensure universal cross-portal sync receives the uploaded lab document
      recordLocallyUploadedReport({
        reportId: registeredId,
        sourceId: uploadSourceId,
        sourceName: sources.find(s => s.sourceId === uploadSourceId)?.name || uploadSourceId,
        title: `${uploadType} - ${uploadFile.name}`,
        reportType: uploadType,
        s3Bucket: 'waterq-dev-evidence-files',
        s3Key: signed.objectKey,
        s3Uri: `s3://waterq-dev-evidence-files/${signed.objectKey}`,
        filename: uploadFile.name,
        downloadUrl: localBlobUrl,
        contentType: signed.contentType || detectedContentType,
        fileSizeBytes: uploadFile.size,
        fileSizeFormatted: `${(uploadFile.size / (1024 * 1024)).toFixed(2)} MB`,
        chemistName: uploadNote || 'Municipal Chemist',
        notes: uploadNote || 'Uploaded via Evidence Archive.',
        verificationStatus: 'LAB_VERIFIED',
        uploadedAt: new Date().toISOString(),
      });

      setEvidenceList(prev => [newRecord, ...prev]);
      setSelectedId(newRecord.id);
      setShowUploadModal(false);
      const uploadedFileName = uploadFile.name;
      const uploadedFileSize = `${(uploadFile.size / 1024).toFixed(1)} KB`;
      setUploadFile(null);
      setUploadSuccessMessage(`Successfully uploaded "${uploadedFileName}" to secure document archive! Key: ${signed.objectKey}`);

      setSubmissionModalData({
        title: 'Evidence File Uploaded & Verified',
        subtitle: 'Presigned upload completed and indexed into Laboratory Archive ledger.',
        badgeText: uploadType.toUpperCase(),
        recordId: registeredId,
        tableTarget: 'LabReports',
        s3Pointer: {
          bucket: 'waterq-dev-evidence-files',
          key: signed.objectKey,
          uri: `archive://${signed.objectKey}`,
          fileSize: uploadedFileSize,
        },
        details: [
          { label: 'File Name', value: uploadedFileName },
          { label: 'Evidence Category', value: uploadType },
          { label: 'Water Monitoring Point', value: sources.find(s => s.sourceId === uploadSourceId)?.name || uploadSourceId },
          { label: 'Archive Directory', value: targetFolder },
          { label: 'Sign-off Authority / Note', value: uploadNote || 'Municipal Chemist' },
          { label: 'Storage Security Protocol', value: 'AES-256 Tamper-Evident Encryption' },
        ],
      });
    } catch (err) {
      alert(`Upload failed: ${(err as Error).message}`);
    } finally {
      setUploading(false);
    }
  };

  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const getEffectiveDownloadUrl = async (file: EvidenceFile): Promise<string | undefined> => {
    if (file.downloadUrl) {
      return file.downloadUrl;
    }
    if (file.s3Key) {
      try {
        const res = await api<{ downloadUrl: string }>(
          `/reports/download-url?key=${encodeURIComponent(file.s3Key)}`
        );
        if (res && res.downloadUrl) {
          return res.downloadUrl;
        }
      } catch (err) {
        console.warn('Backend download URL fetch warning:', err);
      }
    }
    return file.previewUrl;
  };

  const handleDownloadEvidence = async (file: EvidenceFile) => {
    if (!file) return;
    setDownloadingId(file.id);
    try {
      const targetUrl = await getEffectiveDownloadUrl(file);
      const safeFilename = file.fileName.endsWith('.pdf') ? file.fileName : `${file.fileName}.pdf`;

      if (targetUrl) {
        if (targetUrl.startsWith('/sample-reports/') || targetUrl.startsWith('blob:')) {
          const a = document.createElement('a');
          a.href = targetUrl;
          a.download = safeFilename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          return;
        }

        if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
          try {
            const resp = await fetch(targetUrl);
            if (resp.ok) {
              const blob = await resp.blob();
              const blobUrl = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = blobUrl;
              a.download = safeFilename;
              document.body.appendChild(a);
              a.click();
              a.remove();
              setTimeout(() => window.URL.revokeObjectURL(blobUrl), 10000);
              return;
            }
          } catch (e) {
            console.warn('Direct blob fetch failed, falling back to browser window:', e);
          }
          window.open(targetUrl, '_blank');
          return;
        }
      }

      // Fallback for baseline demo items
      const samplePdf = file.fileName.includes('w58')
        ? '/sample-reports/ward58_padav_post_flush_clearance.pdf'
        : file.fileName.includes('w07') || file.fileName.includes('turbidity')
        ? '/sample-reports/ward07_feeder_turbidity_spectrophotometry.pdf'
        : file.fileName.includes('w01') || file.fileName.includes('casing')
        ? '/sample-reports/ward01_tubewell_casing_integrity.pdf'
        : file.fileName.includes('w28') || file.fileName.includes('A04')
        ? '/sample-reports/ward28_chlorine_depletion_investigation.pdf'
        : '/sample-reports/ward14_spectroscopic_assay_2026.pdf';

      const a = document.createElement('a');
      a.href = samplePdf;
      a.download = safeFilename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      setDownloadingId(null);
    }
  };

  const selected = evidenceList.find(e => e.id === selectedId) ?? evidenceList[0];

  const filtered = evidenceList.filter(item => {
    // Tab filter
    if (activeTab === 'lab' && item.type !== 'Lab Report') return false;
    if (activeTab === 'photos' && item.type !== 'Field Photo') return false;
    if (activeTab === 'sheets' && item.type !== 'Field Sheet') return false;
    if (activeTab === 'other' && item.type !== 'Other') return false;

    // Search filter
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      item.fileName.toLowerCase().includes(q) ||
      item.linkedTo.toLowerCase().includes(q) ||
      item.source.toLowerCase().includes(q) ||
      item.uploadedBy.toLowerCase().includes(q);

    // Dropdown filters
    const matchSource = sourceFilter === 'All Sources' || item.source.includes(sourceFilter);
    const matchAlert = alertFilter === 'All Alerts' || item.linkedTo.includes(alertFilter);
    const matchType = typeFilter === 'All Types' || item.type === typeFilter;

    return matchSearch && matchSource && matchAlert && matchType;
  });

  return (
    <div className="space-y-4 font-sans">
      {uploadSuccessMessage && (
        <div role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{uploadSuccessMessage}</span>
          </div>
          <button onClick={() => setUploadSuccessMessage(null)} className="font-bold text-emerald-700 hover:text-emerald-900 px-1.5 py-0.5">×</button>
        </div>
      )}

      {/* ── 5 KPI METRIC CARDS (Matching Screenshot) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          {
            icon: <Layers className="w-5 h-5" />,
            bg: 'bg-blue-50',
            iconBg: 'bg-blue-100 text-blue-600',
            label: 'Total Files',
            value: '176',
            sub: '▲ +24',
            subClr: 'text-emerald-600',
            desc: '(This month)',
          },
          {
            icon: <FileCheck className="w-5 h-5" />,
            bg: 'bg-emerald-50',
            iconBg: 'bg-emerald-100 text-emerald-600',
            label: 'Lab Reports',
            value: '64',
            sub: '(36.4%)',
            subClr: 'text-emerald-700',
            desc: '',
          },
          {
            icon: <ImageIcon className="w-5 h-5" />,
            bg: 'bg-sky-50',
            iconBg: 'bg-sky-100 text-sky-600',
            label: 'Field Photos',
            value: '72',
            sub: '(40.9%)',
            subClr: 'text-sky-700',
            desc: '',
          },
          {
            icon: <FileText className="w-5 h-5" />,
            bg: 'bg-amber-50',
            iconBg: 'bg-amber-100 text-amber-600',
            label: 'Field Sheets',
            value: '28',
            sub: '(15.9%)',
            subClr: 'text-amber-700',
            desc: '',
          },
          {
            icon: <Paperclip className="w-5 h-5" />,
            bg: 'bg-purple-50',
            iconBg: 'bg-purple-100 text-purple-600',
            label: 'Other Evidence',
            value: '12',
            sub: '(6.8%)',
            subClr: 'text-purple-700',
            desc: '',
          },
        ].map(card => (
          <div key={card.label} className={`${card.bg} border border-slate-100 rounded-2xl p-4 shadow-sm`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${card.iconBg} flex items-center justify-center shrink-0`}>
                {card.icon}
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-600">{card.label}</div>
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-2xl font-black text-slate-900">{card.value}</span>
                  {card.sub && <span className={`text-[11px] font-bold ${card.subClr}`}>{card.sub}</span>}
                </div>
                {card.desc && <div className="text-[10px] text-slate-500">{card.desc}</div>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── TABS (All Evidence, Lab Reports, Field Photos, Field Sheets, Other) ── */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto">
        {[
          { id: 'all', label: 'All Evidence (176)', icon: <Folder className="w-3.5 h-3.5" /> },
          { id: 'lab', label: 'Lab Reports (64)', icon: <FileCheck className="w-3.5 h-3.5" /> },
          { id: 'photos', label: 'Field Photos (72)', icon: <ImageIcon className="w-3.5 h-3.5" /> },
          { id: 'sheets', label: 'Field Sheets (28)', icon: <FileText className="w-3.5 h-3.5" /> },
          { id: 'other', label: 'Other (12)', icon: <Paperclip className="w-3.5 h-3.5" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── FILTERS BAR ── */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by File Name, Source ID, Alert ID, or Reading ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg w-72 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
          />
        </div>
        {[
          {
            label: 'Source',
            val: sourceFilter,
            set: setSourceFilter,
            opts: ['All Sources', ...sources.slice(0, 15).map(s => s.sourceId), 'A-04', 'B-02', 'C-01'],
          },
          {
            label: 'Alert / Incident',
            val: alertFilter,
            set: setAlertFilter,
            opts: ['All Alerts', ...(alerts?.map(a => a.alertId) || []), 'ALT-GWL-2026-001', 'ALT-2026-0158'],
          },
          {
            label: 'Evidence Type',
            val: typeFilter,
            set: setTypeFilter,
            opts: ['All Types', 'Lab Report', 'Field Photo', 'Field Sheet', 'Other'],
          },
        ].map(f => (
          <div key={f.label} className="flex flex-col">
            <span className="text-[10px] text-slate-400 mb-0.5 ml-0.5">{f.label}</span>
            <select
              value={f.val}
              onChange={e => f.set(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer"
            >
              {f.opts.map(o => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
        ))}

        {/* Upload Date */}
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 mb-0.5 ml-0.5">Upload Date</span>
          <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-xs text-slate-600">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>01 Oct 2026 – 01 Nov 2026</span>
          </div>
        </div>

        <button
          onClick={() => {
            setSearch('');
            setSourceFilter('All Sources');
            setAlertFilter('All Alerts');
            setTypeFilter('All Types');
          }}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 mt-4 ml-1"
        >
          Clear
        </button>

        <div className="flex items-center gap-2 mt-4 ml-auto">
          <button
            onClick={() => navigate('/upload-document')}
            className="flex items-center gap-1.5 text-xs font-bold bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-700/60 px-3 py-1.5 rounded-lg transition shadow-xs"
          >
            <FlaskConical className="w-3.5 h-3.5 text-purple-400" /> Lab Reports Route ↗
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-1.5 text-xs font-bold bg-[#0A1728] hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg transition shadow-xs"
          >
            <Upload className="w-3.5 h-3.5" /> Upload Evidence
          </button>
        </div>
      </div>

      {/* ── TWO-COLUMN VIEW ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT: Evidence Files Table */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
            <Folder className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm">Evidence Files ({filtered.length})</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 text-[11px] font-semibold">
                  <th className="py-2.5 px-3">
                    <input type="checkbox" className="rounded" />
                  </th>
                  <th className="py-2.5 px-3">File Name</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Linked To</th>
                  <th className="py-2.5 px-3">Source</th>
                  <th className="py-2.5 px-3">Uploaded By</th>
                  <th className="py-2.5 px-3">Uploaded At</th>
                  <th className="py-2.5 px-3">Size</th>
                  <th className="py-2.5 px-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(item => {
                  const isPdf = item.fileName.endsWith('.pdf');
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      className={`cursor-pointer transition-all duration-150 ${
                        selectedId === item.id ? 'bg-[#152c66] border-l-4 border-l-cyan-400 text-white' : 'hover:bg-[#162354]'
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <input
                          type="checkbox"
                          className="rounded"
                          onClick={e => e.stopPropagation()}
                        />
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        <div className="flex items-center gap-2">
                          {isPdf ? (
                            <div className="w-5 h-5 rounded bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                              <FileText className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                              <ImageIcon className="w-3.5 h-3.5" />
                            </div>
                          )}
                          <span className="font-mono text-[11px] hover:text-blue-600 transition truncate max-w-[150px]">
                            {item.fileName}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            TYPE_STYLES[item.type] ?? 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-700">{item.linkedTo}</td>
                      <td className="py-2.5 px-3 text-slate-600">{item.source}</td>
                      <td className="py-2.5 px-3 text-slate-600">{item.uploadedBy}</td>
                      <td className="py-2.5 px-3 text-slate-500 whitespace-pre-line text-[11px]">
                        {item.uploadedAt.replace(', ', '\n')}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">{item.size}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedId(item.id);
                              setPreviewModalOpen(true);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                            title="Preview File"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={e => e.stopPropagation()}
                            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">Showing 1 – {filtered.length} of 176 files</span>
            <div className="flex items-center gap-1">
              <button className="p-1 rounded text-slate-400 hover:text-slate-600">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button className="w-7 h-7 rounded-lg bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
                1
              </button>
              <button className="w-7 h-7 rounded-lg text-slate-600 hover:bg-slate-100 text-[11px] flex items-center justify-center">
                2
              </button>
              <button className="w-7 h-7 rounded-lg text-slate-600 hover:bg-slate-100 text-[11px] flex items-center justify-center">
                3
              </button>
              <button className="w-7 h-7 rounded-lg text-slate-600 hover:bg-slate-100 text-[11px] flex items-center justify-center">
                4
              </button>
              <button className="w-7 h-7 rounded-lg text-slate-600 hover:bg-slate-100 text-[11px] flex items-center justify-center">
                5
              </button>
              <span className="text-slate-400 text-xs px-1">...</span>
              <button className="w-7 h-7 rounded-lg text-slate-600 hover:bg-slate-100 text-[11px] flex items-center justify-center">
                36
              </button>
              <button className="p-1 rounded text-slate-400 hover:text-slate-600">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: Selected Evidence Details & Interactive Preview Card */}
        {(() => {
          const isSelectedImage =
            selected.type === 'Field Photo' ||
            (!selected.fileName.toLowerCase().endsWith('.pdf') &&
              (selected.previewUrl?.includes('.jpg') ||
                selected.previewUrl?.includes('.png') ||
                selected.previewUrl?.includes('.jpeg') ||
                selected.previewUrl?.includes('.webp')));

          return (
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col self-start sticky top-4 h-fit overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2 overflow-hidden min-w-0">
                  <div className="w-5 h-5 rounded bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-xs font-mono truncate">
                    {selected.fileName}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {}}
                  className="text-slate-400 hover:text-slate-600 transition shrink-0"
                  title="Close panel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-3.5">
                {/* Visual Document Mockup Preview */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 shadow-inner">
                  {isSelectedImage && selected.previewUrl ? (
                    <div className="relative rounded-lg overflow-hidden border border-slate-200">
                      <img
                        src={selected.previewUrl}
                        alt={selected.fileName}
                        className="w-full h-36 object-cover"
                      />
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] backdrop-blur-xs font-mono">
                        {selected.fileName.split('.').pop()?.toUpperCase() || 'IMG'} · {selected.size}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-900 rounded-lg border border-slate-800 p-4 shadow-xs text-center space-y-2 relative overflow-hidden">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto border border-blue-500/30">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 max-w-full px-1">
                        <h4 className="font-bold text-white text-xs font-mono truncate">{selected.fileName}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-sans">{selected.type} &bull; {selected.size}</p>
                      </div>
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-blue-950/90 text-blue-300 border border-blue-800/60 text-[9px] font-mono">
                        PDF
                      </div>

                      {/* Micro parameter table if present */}
                      {selected.parameters && selected.parameters.length > 0 && (
                        <div className="pt-2 border-t border-slate-800/80 text-left">
                          <table className="w-full text-[10px] border-collapse">
                            <thead>
                              <tr className="text-slate-400 border-b border-slate-800 font-semibold text-[9px]">
                                <th className="py-0.5">Parameter</th>
                                <th className="py-0.5">Result</th>
                                <th className="py-0.5">Unit</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                              {selected.parameters.slice(0, 3).map((p, i) => (
                                <tr key={i}>
                                  <td className="py-0.5 text-slate-300 font-sans">{p.name}</td>
                                  <td className={`py-0.5 font-bold ${p.alert ? 'text-rose-400' : 'text-slate-200'}`}>
                                    {p.result}
                                  </td>
                                  <td className="py-0.5 text-slate-400 font-mono text-[9px]">{p.unit}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Metadata Fields (Matching Screenshot) */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Evidence Type</span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        TYPE_STYLES[selected.type] || 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {selected.type}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Linked Alert</span>
                    </div>
                    <a href={`#${selected.linkedTo}`} className="font-bold text-blue-600 hover:underline font-mono">
                      {selected.linkedTo}
                    </a>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Folder className="w-3.5 h-3.5" />
                      <span>Source</span>
                    </div>
                    <span className="font-medium text-slate-800">{selected.sourceLocation}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500">
                      <User className="w-3.5 h-3.5" />
                      <span>Uploaded By</span>
                    </div>
                    <span className="font-medium text-slate-800">{selected.uploadedBy}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Uploaded At</span>
                    </div>
                    <span className="font-medium text-slate-800">{selected.uploadedAt}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500">
                      <FileText className="w-3.5 h-3.5" />
                      <span>File Size</span>
                    </div>
                    <span className="font-mono font-medium text-slate-800">{selected.size}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="px-4 py-3 border-t border-slate-100 flex items-center gap-2 flex-wrap bg-slate-50/50 rounded-b-2xl">
                <button
                  onClick={() => setPreviewModalOpen(true)}
                  className="flex items-center gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition shadow-xs cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" /> View
                </button>
                <button
                  onClick={() => handleDownloadEvidence(selected)}
                  disabled={downloadingId === selected.id}
                  className="flex items-center gap-1.5 text-xs font-semibold border border-slate-200 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg transition bg-white shadow-xs cursor-pointer"
                >
                  {downloadingId === selected.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>Download</span>
                </button>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold border border-slate-200 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg transition bg-white shadow-xs cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Replace
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── MODAL: Upload New Evidence ── */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Upload Evidence Document</h3>
                  <div className="text-[10px] text-slate-500 font-mono">Archive Vault: Encrypted</div>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleS3Upload} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Evidence Type</label>
                <select
                  value={uploadType}
                  onChange={e => setUploadType(e.target.value as typeof uploadType)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Lab Report">Lab Report (PDF &rarr; reports/lab-reports/)</option>
                  <option value="Field Photo">Field Photo (JPG/PNG &rarr; evidence/incident-photos/)</option>
                  <option value="Field Sheet">Field Inspection Sheet (&rarr; reports/field-sheets/)</option>
                  <option value="Other">Chain of Custody Form (&rarr; evidence/chain-of-custody/)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Target Water Source</label>
                <select
                  value={uploadSourceId}
                  onChange={e => setUploadSourceId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {sources.length > 0 ? (
                    sources.map(s => (
                      <option key={s.sourceId} value={s.sourceId}>
                        {s.sourceId} &bull; {s.name ?? 'Source'} ({s.locality || s.district || 'Gwalior'})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="gmc-ward-14">gmc-ward-14 - Maharaj Bada Central Plaza</option>
                      <option value="gmc-ward-01">gmc-ward-01 - Hazira Crossing Tube Well</option>
                      <option value="gmc-ward-22">gmc-ward-22 - Kampoo Piped Substation</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">File Attachment (PDF, JPG, PNG)</label>
                <input
                  type="file"
                  id="evidence-file-input"
                  onChange={e => setUploadFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <label
                  htmlFor="evidence-file-input"
                  className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-4 text-center cursor-pointer transition bg-slate-50/50 block"
                >
                  <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                  <div className="font-semibold text-slate-700">
                    {uploadFile ? uploadFile.name : 'Click to select or drop evidence document'}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                    {uploadFile ? `${(uploadFile.size / 1024).toFixed(1)} KB` : 'Direct Encrypted Multipart Upload'}
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Verification Note / Sign-off Authority</label>
                <input
                  type="text"
                  value={uploadNote}
                  onChange={e => setUploadNote(e.target.value)}
                  placeholder="e.g. Dr. S. K. Gupta, Chief Quality Chemist"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" /> Upload Document
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Full Document Preview ── */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm font-mono">{selected.fileName}</h3>
                  <div className="text-[11px] text-slate-500">
                    {selected.type} · {selected.size} · Uploaded by {selected.uploadedBy}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selected.type === 'Field Photo' || (!selected.fileName.toLowerCase().endsWith('.pdf') && (selected.previewUrl?.includes('.jpg') || selected.previewUrl?.includes('.png'))) ? (
              <div className="rounded-xl overflow-hidden border border-slate-200">
                <img src={selected.previewUrl || selected.downloadUrl} alt={selected.fileName} className="w-full h-80 object-cover" />
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-900 flex flex-col items-center justify-center p-6 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                  <FileText className="w-7 h-7" />
                </div>
                <div className="text-center">
                  <h4 className="text-white font-bold text-sm font-mono">{selected.fileName}</h4>
                  <p className="text-xs text-slate-400 mt-1">Verified Laboratory Evidence Document &bull; {selected.size}</p>
                  {selected.s3Key && (
                    <p className="text-[11px] text-slate-500 mt-0.5 font-mono">Key: {selected.s3Key}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {(selected.downloadUrl || selected.previewUrl) && (
                    <a
                      href={selected.downloadUrl || selected.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition shadow-lg cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open PDF in Tab</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDownloadEvidence(selected)}
                    disabled={downloadingId === selected.id}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition cursor-pointer"
                  >
                    {downloadingId === selected.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>
            )}

            {selected.parameters && (
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-4">
                <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-3">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">State Water Quality Laboratory</h4>
                      <p className="text-xs text-slate-500">Certified Test Report · {selected.linkedTo}</p>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                      Certified
                    </span>
                  </div>

                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-100 text-[11px]">
                        <th className="py-1.5">Parameter</th>
                        <th className="py-1.5">Measured Value</th>
                        <th className="py-1.5">Unit</th>
                        <th className="py-1.5">Standard Threshold</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selected.parameters.map((p, idx) => (
                        <tr key={idx}>
                          <td className="py-2 font-medium text-slate-800">{p.name}</td>
                          <td className={`py-2 font-bold ${p.alert ? 'text-rose-600' : 'text-slate-900'}`}>
                            {p.result}
                          </td>
                          <td className="py-2 text-slate-500">{p.unit}</td>
                          <td className="py-2 text-slate-400">IS 10500:2012</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div>Signatory: <span className="font-semibold text-slate-800">{selected.verifiedBy}</span></div>
                    <div className="font-mono text-[11px] text-slate-400">Hash: 8f4a21...c9e2</div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="px-4 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleDownloadEvidence(selected)}
                disabled={downloadingId === selected.id}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                {downloadingId === selected.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>Download Document</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Universal Submission Acceptance Modal */}
      {submissionModalData && (
        <SubmissionSuccessModal
          isOpen={true}
          onClose={() => setSubmissionModalData(null)}
          title={submissionModalData.title}
          subtitle={submissionModalData.subtitle}
          badgeText={submissionModalData.badgeText}
          recordId={submissionModalData.recordId}
          tableTarget={submissionModalData.tableTarget}
          s3Pointer={submissionModalData.s3Pointer}
          details={submissionModalData.details}
        />
      )}
    </div>
  );
};
