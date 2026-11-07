import type { FC } from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  label?: string;
  sublabel?: string;
  size?: 'sm' | 'md' | 'lg';
  fullHeight?: boolean;
  inline?: boolean;
}

export const LoadingSpinner: FC<LoadingSpinnerProps> = ({
  label = 'Fetching live records from Central Database…',
  sublabel = 'Synchronizing Water Grid Surveillance Records',
  size = 'md',
  fullHeight = false,
  inline = false,
}) => {
  if (inline) {
    return (
      <span className="inline-flex items-center gap-2 text-xs text-sky-500 font-medium">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>{label}</span>
      </span>
    );
  }

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-200 ${
        fullHeight ? 'min-h-[300px]' : 'py-12'
      }`}
    >
      <div className="relative mb-3 flex items-center justify-center">
        <div className="absolute w-12 h-12 rounded-full bg-blue-500/15 animate-ping" />
        <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 p-0.5 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <div className="w-full h-full bg-white dark:bg-[#0A1728] rounded-[14px] flex items-center justify-center">
            <Loader2 className={`${iconSizes[size]} text-blue-600 dark:text-cyan-400 animate-spin`} />
          </div>
        </div>
      </div>
      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{label}</p>
      <p
        className="text-[11px] text-slate-400 mt-1 font-mono"
        dangerouslySetInnerHTML={{ __html: sublabel }}
      />
    </div>
  );
};
