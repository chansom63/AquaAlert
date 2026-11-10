import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';

export interface DateRange {
  startDate: string; // 'YYYY-MM-DD' or ''
  endDate: string;   // 'YYYY-MM-DD' or ''
}

interface DateRangePickerProps {
  label?: string;
  value: DateRange;
  onChange: (range: DateRange) => void;
  defaultLabel?: string;
  className?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  label = 'Date Range',
  value,
  onChange,
  defaultLabel = 'All Dates',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempStart, setTempStart] = useState(value.startDate);
  const [tempEnd, setTempEnd] = useState(value.endDate);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTempStart(value.startDate);
    setTempEnd(value.endDate);
  }, [value]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Formatted display text
  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const displayText = () => {
    if (value.startDate && value.endDate) {
      return `${formatDisplayDate(value.startDate)} – ${formatDisplayDate(value.endDate)}`;
    }
    if (value.startDate) {
      return `From ${formatDisplayDate(value.startDate)}`;
    }
    if (value.endDate) {
      return `Until ${formatDisplayDate(value.endDate)}`;
    }
    return defaultLabel;
  };

  const handleApply = () => {
    onChange({ startDate: tempStart, endDate: tempEnd });
    setIsOpen(false);
  };

  const handleClear = () => {
    setTempStart('');
    setTempEnd('');
    onChange({ startDate: '', endDate: '' });
    setIsOpen(false);
  };

  const handlePreset = (preset: 'today' | 'last7' | 'last30' | 'thisMonth' | 'all') => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'all') {
      handleClear();
      return;
    }
    if (preset === 'today') {
      setTempStart(todayStr);
      setTempEnd(todayStr);
      onChange({ startDate: todayStr, endDate: todayStr });
      setIsOpen(false);
      return;
    }
    if (preset === 'last7') {
      const past = new Date();
      past.setDate(today.getDate() - 7);
      const pastStr = past.toISOString().split('T')[0];
      setTempStart(pastStr);
      setTempEnd(todayStr);
      onChange({ startDate: pastStr, endDate: todayStr });
      setIsOpen(false);
      return;
    }
    if (preset === 'last30') {
      const past = new Date();
      past.setDate(today.getDate() - 30);
      const pastStr = past.toISOString().split('T')[0];
      setTempStart(pastStr);
      setTempEnd(todayStr);
      onChange({ startDate: pastStr, endDate: todayStr });
      setIsOpen(false);
      return;
    }
    if (preset === 'thisMonth') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      setTempStart(firstDay);
      setTempEnd(todayStr);
      onChange({ startDate: firstDay, endDate: todayStr });
      setIsOpen(false);
      return;
    }
  };

  const hasFilter = Boolean(value.startDate || value.endDate);

  return (
    <div className={`relative flex flex-col ${className}`} ref={popoverRef}>
      {label && <span className="text-[10px] text-slate-400 mb-0.5 ml-0.5">{label}</span>}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`flex items-center gap-2 border rounded-lg px-2.5 py-1.5 text-xs transition cursor-pointer shadow-xs ${
          hasFilter
            ? 'border-blue-500 bg-blue-50/80 text-blue-900 font-semibold'
            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
        }`}
        title="Click to open calendar"
      >
        <Calendar className={`w-3.5 h-3.5 ${hasFilter ? 'text-blue-600' : 'text-slate-400'}`} />
        <span className="font-mono text-[11px] truncate max-w-[200px]">{displayText()}</span>
        <ChevronDown className={`w-3 h-3 ml-auto transition-transform ${isOpen ? 'rotate-180 text-blue-600' : 'text-slate-400'}`} />
      </button>

      {/* Popover Calendar Card */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 w-72 text-xs animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2 font-bold text-slate-800 text-xs">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Select Date Range</span>
            </div>
            {hasFilter && (
              <button
                type="button"
                onClick={handleClear}
                className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick Presets */}
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            <button
              type="button"
              onClick={() => handlePreset('last7')}
              className="px-2 py-1 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 rounded-lg text-[10px] font-semibold transition cursor-pointer"
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => handlePreset('last30')}
              className="px-2 py-1 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 rounded-lg text-[10px] font-semibold transition cursor-pointer"
            >
              Last 30 Days
            </button>
            <button
              type="button"
              onClick={() => handlePreset('thisMonth')}
              className="px-2 py-1 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 rounded-lg text-[10px] font-semibold transition cursor-pointer"
            >
              This Month
            </button>
          </div>

          {/* Date Range Inputs */}
          <div className="space-y-2 mb-4">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">From Date</label>
              <input
                type="date"
                value={tempStart}
                onChange={e => setTempStart(e.target.value)}
                onClick={e => {
                  try {
                    (e.currentTarget as HTMLInputElement).showPicker?.();
                  } catch {}
                }}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 bg-slate-50 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">To Date</label>
              <input
                type="date"
                value={tempEnd}
                onChange={e => setTempEnd(e.target.value)}
                onClick={e => {
                  try {
                    (e.currentTarget as HTMLInputElement).showPicker?.();
                  } catch {}
                }}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 bg-slate-50 cursor-pointer"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
