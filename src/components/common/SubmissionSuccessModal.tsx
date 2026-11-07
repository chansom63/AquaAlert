import type { FC, ReactNode } from 'react';
import { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Database,
  Download,
  ExternalLink,
  Folder,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';

export interface SubmissionDetail {
  label: string;
  value: ReactNode;
  isMono?: boolean;
  copyable?: string;
  badge?: string;
}

export interface SubmissionSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  badgeText?: string;
  recordId?: string;
  tableTarget?: 'LabReports' | 'WaterReadings' | 'ResponseActions' | 'WaterSources' | string;
  s3Pointer?: {
    bucket: string;
    key: string;
    uri?: string;
    downloadUrl?: string;
    fileSize?: string;
  };
  details?: SubmissionDetail[];
  actionButtonText?: string;
  onActionClick?: () => void;
}

export const SubmissionSuccessModal: FC<SubmissionSuccessModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  badgeText = 'SUBMISSION ACCEPTED',
  recordId,
  tableTarget,
  s3Pointer,
  details = [],
  actionButtonText,
  onActionClick,
}) => {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const s3Uri = s3Pointer?.uri || (s3Pointer ? `s3://${s3Pointer.bucket}/${s3Pointer.key}` : undefined);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in-50"
      onClick={onClose}
    >
      <div
        className="bg-[#0A1130] text-slate-100 rounded-3xl border border-emerald-500/40 shadow-2xl shadow-emerald-950/50 max-w-lg w-full p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-200 relative overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0">
              <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  {badgeText}
                </span>
                {tableTarget && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-700/60 flex items-center gap-1">
                    <Database className="w-2.5 h-2.5 text-blue-400" />
                    {tableTarget}
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight mt-1">
                {title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subtitle / Descriptive message */}
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed relative z-10">
          {subtitle}
        </p>

        {/* Primary Record Identity Banner */}
        {recordId && (
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/90 flex items-center justify-between gap-2 relative z-10">
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                Ingested Record ID
              </div>
              <div className="text-sm font-mono font-black text-emerald-300 truncate">
                {recordId}
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(recordId, 'recordId')}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] font-mono flex items-center gap-1 transition border border-slate-700/60 cursor-pointer shrink-0"
            >
              {copiedText === 'recordId' ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy ID</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Document Archive Pointer Box (if applicable) */}
        {s3Pointer && (
          <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-600/40 space-y-2 relative z-10">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono font-bold text-emerald-300 flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-emerald-400" />
                Certified Document Reference:
              </span>
              {s3Pointer.fileSize && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  {s3Pointer.fileSize}
                </span>
              )}
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/90 text-slate-200 text-[11px] font-mono break-all border border-slate-800/80 select-all leading-relaxed">
              {s3Pointer.key || s3Uri}
            </div>

            <div className="flex items-center justify-between pt-1 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => handleCopy(s3Pointer.key || s3Uri || '', 's3Uri')}
                className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                {copiedText === 's3Uri' ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>Copied Reference!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Reference Key</span>
                  </>
                )}
              </button>

              {s3Pointer.downloadUrl && (
                <a
                  href={s3Pointer.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>Download Document</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Structured Details Grid */}
        {details.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 divide-y divide-slate-800/60 text-xs relative z-10">
            {details.map((item, idx) => (
              <div key={idx} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                <span className="text-slate-400">{item.label}</span>
                <span className={`font-semibold text-white text-right truncate ${item.isMono ? 'font-mono text-emerald-300' : ''}`}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Footer Buttons */}
        <div className="pt-2 flex items-center justify-end gap-3 relative z-10">
          {actionButtonText && onActionClick && (
            <button
              type="button"
              onClick={onActionClick}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700 cursor-pointer"
            >
              {actionButtonText}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer border-0"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Acknowledge &amp; Continue</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubmissionSuccessModal;
