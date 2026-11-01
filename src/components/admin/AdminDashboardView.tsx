import { useEffect, useRef, useState } from 'react';
import type { FC } from 'react';
import L from 'leaflet';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Droplet,
  FlaskConical,
  FlaskRound,
  MapPin,
  Layers,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Upload,
  Zap,
} from 'lucide-react';
import type { Alert, Source } from '../../types/water';

interface AdminDashboardViewProps {
  sources: Source[];
  alerts: Alert[];
  onOpenAlertDetail: (alertId: string) => void;
  onOpenSourceDetail: (sourceId: string) => void;
  onNavigateTo: (view: string) => void;
  onQuickAction: (action: 'submit-reading' | 'record-action' | 'rules' | 'upload-evidence') => void;
}

export const AdminDashboardView: FC<AdminDashboardViewProps> = ({
  onOpenAlertDetail,
  onNavigateTo,
  onQuickAction,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [lastCheckedTime, setLastCheckedTime] = useState('01 Nov 2026, 07:45 PM');
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);

  // Initialize Leaflet Map for "Water Sources (Map View)"
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Coordinates centered around region with river / topography
      const map = L.map(mapContainerRef.current, {
        center: [25.4484, 78.5685], // Jhansi - Orchha regional hub
        zoom: 11,
        zoomControl: false,
        attributionControl: false,
      });

      // CartoDB Positron clean light basemap
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 18,
        subdomains: 'abcd',
      }).addTo(map);

      // Add Zoom Control at bottom right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Pins matching the screenshot:
      // Red (Critical center), Orange (High), Yellow (Warning), Green (Safe)
      const pinPoints = [
        { lat: 25.452, lng: 78.575, status: 'critical', name: 'A-04 (Jhansi)' },
        { lat: 25.485, lng: 78.540, status: 'high', name: 'B-02 (Orchha)' },
        { lat: 25.498, lng: 78.590, status: 'high', name: 'C-01 (Datia)' },
        { lat: 25.425, lng: 78.520, status: 'warning', name: 'D-03 (Lalitpur)' },
        { lat: 25.410, lng: 78.620, status: 'warning', name: 'E-05 (Jhansi)' },
        { lat: 25.470, lng: 78.490, status: 'safe', name: 'Source S-01' },
        { lat: 25.510, lng: 78.530, status: 'safe', name: 'Source S-02' },
        { lat: 25.430, lng: 78.580, status: 'safe', name: 'Source S-03' },
        { lat: 25.460, lng: 78.650, status: 'safe', name: 'Source S-04' },
      ];

      pinPoints.forEach(pt => {
        let pinColor = '#10b981'; // safe green
        let pulseGlow = 'rgba(16, 185, 129, 0.4)';
        let symbol = '✓';

        if (pt.status === 'critical') {
          pinColor = '#ef4444';
          pulseGlow = 'rgba(239, 68, 68, 0.6)';
          symbol = '!';
        } else if (pt.status === 'high') {
          pinColor = '#f97316';
          pulseGlow = 'rgba(249, 115, 22, 0.5)';
          symbol = '▲';
        } else if (pt.status === 'warning') {
          pinColor = '#f59e0b';
          pulseGlow = 'rgba(245, 158, 11, 0.4)';
          symbol = '●';
        }

        const icon = L.divIcon({
          className: 'custom-map-pin',
          html: `
            <div style="position: relative; width: 28px; height: 34px; display: flex; flex-direction: column; align-items: center; justify-content: center; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.3));">
              <div style="width: 24px; height: 24px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); background: ${pinColor}; border: 2px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px ${pulseGlow};">
                <span style="transform: rotate(45deg); color: #ffffff; font-size: 11px; font-weight: 900; line-height: 1;">${symbol}</span>
              </div>
            </div>
          `,
          iconSize: [28, 34],
          iconAnchor: [14, 34],
        });

        const marker = L.marker([pt.lat, pt.lng], { icon });
        marker.bindTooltip(`<strong>${pt.name}</strong><br/>Status: ${pt.status.toUpperCase()}`, {
          direction: 'top',
          offset: [0, -30],
        });
        marker.addTo(map);
      });

      mapInstanceRef.current = map;

      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const handleRefreshStatus = () => {
    setIsRefreshingStatus(true);
    setTimeout(() => {
      const now = new Date();
      const formatted = now.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }) + ', ' + now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      setLastCheckedTime(formatted);
      setIsRefreshingStatus(false);
    }, 600);
  };

  return (
    <div className="space-y-4 font-sans text-slate-800">
      {/* 1. TOP METRIC CARDS (5 Cards in a row) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Water Sources */}
        <div className="bg-sky-50/70 border border-sky-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center shrink-0 shadow-inner">
              <Droplet className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-700">Water Sources</div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-black text-slate-900 tracking-tight">148</span>
                <span className="text-xs font-bold text-emerald-600 flex items-center">▲ +3</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Active sources</div>
            </div>
          </div>
        </div>

        {/* Card 2: Total Readings */}
        <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-inner">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-700">Total Readings</div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-black text-slate-900 tracking-tight">2,846</span>
                <span className="text-xs font-bold text-emerald-600 flex items-center">▲ +128</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">(Last 7 days)</div>
            </div>
          </div>
        </div>

        {/* Card 3: Active Alerts */}
        <div className="bg-rose-50/70 border border-rose-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-inner">
              <AlertTriangle className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-700">Active Alerts</div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-black text-slate-900 tracking-tight">5</span>
                <span className="text-xs font-bold text-rose-600 flex items-center">▲ +2</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Requiring action</div>
            </div>
          </div>
        </div>

        {/* Card 4: Pending Lab */}
        <div className="bg-amber-50/70 border border-amber-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 shadow-inner">
              <FlaskRound className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-700">Pending Lab</div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-black text-slate-900 tracking-tight">12</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Awaiting verification</div>
            </div>
          </div>
        </div>

        {/* Card 5: Resolved (7 days) */}
        <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-inner">
              <CheckCircle2 className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-700">Resolved (7 days)</div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-black text-slate-900 tracking-tight">27</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Closed incidents</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MIDDLE ROW (Active Alerts & Incidents Table + Water Sources Map View) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Active Alerts & Incidents Table (~58% width / 7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <h3 className="font-bold text-slate-900 text-sm">Active Alerts &amp; Incidents</h3>
              </div>
              <button
                onClick={() => onNavigateTo('Alerts & Incidents')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 transition"
              >
                View All &rarr;
              </button>
            </div>

            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-medium">
                    <th className="py-2.5 px-2 font-semibold">Alert ID</th>
                    <th className="py-2.5 px-2 font-semibold">Source / Location</th>
                    <th className="py-2.5 px-2 font-semibold">Parameter &amp; Value</th>
                    <th className="py-2.5 px-2 font-semibold">Severity</th>
                    <th className="py-2.5 px-2 font-semibold">Status</th>
                    <th className="py-2.5 px-2 font-semibold text-right">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Row 1 */}
                  <tr
                    onClick={() => onOpenAlertDetail('alert-gwl-crit-01')}
                    className="hover:bg-slate-50/80 cursor-pointer transition"
                  >
                    <td className="py-2.5 px-2 font-mono font-medium text-slate-700">ALT-2026-0158</td>
                    <td className="py-2.5 px-2 font-medium text-slate-800">A-04 (Jhansi)</td>
                    <td className="py-2.5 px-2 text-slate-700">
                      pH: <span className="font-bold text-rose-600">9.4</span>
                    </td>
                    <td className="py-2.5 px-2">
                      <span className="inline-flex items-center gap-1 bg-rose-600 text-white font-bold text-[10px] px-2 py-0.5 rounded shadow-sm">
                        ▲ Critical
                      </span>
                    </td>
                    <td className="py-2.5 px-2">
                      <span className="inline-flex items-center bg-sky-100 text-sky-700 font-semibold text-[11px] px-2.5 py-0.5 rounded-full">
                        Open
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-slate-500 text-right whitespace-nowrap">2 min ago</td>
                  </tr>

                  {/* Row 2 */}
                  <tr
                    onClick={() => onOpenAlertDetail('alert-gwl-high-02')}
                    className="hover:bg-slate-50/80 cursor-pointer transition"
                  >
                    <td className="py-2.5 px-2 font-mono font-medium text-slate-700">ALT-2026-0157</td>
                    <td className="py-2.5 px-2 font-medium text-slate-800">B-02 (Orchha)</td>
                    <td className="py-2.5 px-2 text-slate-700">
                      Turbidity: <span className="font-bold text-rose-600">12.6 NTU</span>
                    </td>
                    <td className="py-2.5 px-2">
                      <span className="inline-flex items-center gap-1 bg-orange-500 text-white font-bold text-[10px] px-2 py-0.5 rounded shadow-sm">
                        ▲ High
                      </span>
                    </td>
                    <td className="py-2.5 px-2">
                      <span className="inline-flex items-center bg-sky-100 text-sky-700 font-semibold text-[11px] px-2.5 py-0.5 rounded-full">
                        Open
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-slate-500 text-right whitespace-nowrap">15 min ago</td>
                  </tr>

                  {/* Row 3 */}
                  <tr
                    onClick={() => onOpenAlertDetail('alert-gwl-warn-03')}
                    className="hover:bg-slate-50/80 cursor-pointer transition"
                  >
                    <td className="py-2.5 px-2 font-mono font-medium text-slate-700">ALT-2026-0156</td>
                    <td className="py-2.5 px-2 font-medium text-slate-800">C-01 (Datia)</td>
                    <td className="py-2.5 px-2 text-slate-700">
                      TDS: <span className="font-bold text-rose-600">1,240 mg/L</span>
                    </td>
                    <td className="py-2.5 px-2">
                      <span className="inline-flex items-center gap-1 bg-orange-500 text-white font-bold text-[10px] px-2 py-0.5 rounded shadow-sm">
                        ▲ High
                      </span>
                    </td>
                    <td className="py-2.5 px-2">
                      <span className="inline-flex items-center bg-amber-100 text-amber-800 font-semibold text-[11px] px-2.5 py-0.5 rounded-full">
                        Under Investigation
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-slate-500 text-right whitespace-nowrap">32 min ago</td>
                  </tr>

                  {/* Row 4 */}
                  <tr
                    onClick={() => onOpenAlertDetail('alert-gwl-info-04')}
                    className="hover:bg-slate-50/80 cursor-pointer transition"
                  >
                    <td className="py-2.5 px-2 font-mono font-medium text-slate-700">ALT-2026-0155</td>
                    <td className="py-2.5 px-2 font-medium text-slate-800">D-03 (Lalitpur)</td>
                    <td className="py-2.5 px-2 text-slate-700">
                      pH: <span className="font-bold text-rose-600">6.3</span>
                    </td>
                    <td className="py-2.5 px-2">
                      <span className="inline-flex items-center gap-1 bg-amber-400 text-amber-950 font-bold text-[10px] px-2 py-0.5 rounded shadow-sm">
                        ▲ Warning
                      </span>
                    </td>
                    <td className="py-2.5 px-2">
                      <span className="inline-flex items-center bg-purple-100 text-purple-700 font-semibold text-[11px] px-2.5 py-0.5 rounded-full">
                        Pending Lab
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-slate-500 text-right whitespace-nowrap">1 hr ago</td>
                  </tr>

                  {/* Row 5 */}
                  <tr
                    onClick={() => onOpenAlertDetail('alert-gwl-crit-01')}
                    className="hover:bg-slate-50/80 cursor-pointer transition"
                  >
                    <td className="py-2.5 px-2 font-mono font-medium text-slate-700">ALT-2026-0154</td>
                    <td className="py-2.5 px-2 font-medium text-slate-800">E-05 (Jhansi)</td>
                    <td className="py-2.5 px-2 text-slate-700">
                      Bacteria: <span className="font-bold text-rose-600">Detected</span>
                    </td>
                    <td className="py-2.5 px-2">
                      <span className="inline-flex items-center gap-1 bg-amber-400 text-amber-950 font-bold text-[10px] px-2 py-0.5 rounded shadow-sm">
                        ▲ Warning
                      </span>
                    </td>
                    <td className="py-2.5 px-2">
                      <span className="inline-flex items-center bg-sky-100 text-sky-700 font-semibold text-[11px] px-2.5 py-0.5 rounded-full">
                        Open
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-slate-500 text-right whitespace-nowrap">2 hr ago</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Water Sources Map View (~42% width / 5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-sm">Water Sources (Map View)</h3>
            </div>
            <button
              onClick={() => onNavigateTo('Water Sources')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 transition"
            >
              View Map &rarr;
            </button>
          </div>

          <div className="relative w-full h-[230px] rounded-xl overflow-hidden mt-2 border border-slate-100">
            {/* The Map Div */}
            <div ref={mapContainerRef} className="w-full h-full" />

            {/* Floating Top-Right Legend Box matching screenshot */}
            <div className="absolute top-2.5 right-2.5 z-[400] bg-white/95 backdrop-blur-sm border border-slate-200/80 rounded-xl px-3 py-2 shadow-md text-[11px] font-semibold text-slate-700 space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm"></span>
                <span>Safe (118)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm"></span>
                <span>Warning (18)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm"></span>
                <span>High (7)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shadow-sm"></span>
                <span>Critical (5)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM ROW (Recent Readings + Quick Actions + System Status) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Recent Readings Table (~50% width / 6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-sm">Recent Readings</h3>
            </div>
            <button
              onClick={() => onNavigateTo('Readings')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 transition"
            >
              View All Readings &rarr;
            </button>
          </div>

          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-medium">
                  <th className="py-2 px-1.5 font-semibold">Reading ID</th>
                  <th className="py-2 px-1.5 font-semibold">Source</th>
                  <th className="py-2 px-1.5 font-semibold">Parameter</th>
                  <th className="py-2 px-1.5 font-semibold">Value</th>
                  <th className="py-2 px-1.5 font-semibold">Method</th>
                  <th className="py-2 px-1.5 font-semibold">Verification</th>
                  <th className="py-2 px-1.5 font-semibold text-right">Collected At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Row 1 */}
                <tr className="hover:bg-slate-50/80 transition">
                  <td className="py-2 px-1.5 font-mono font-medium text-slate-700">RD-2026-03124</td>
                  <td className="py-2 px-1.5 font-medium text-slate-800">A-04</td>
                  <td className="py-2 px-1.5 text-slate-700">pH</td>
                  <td className="py-2 px-1.5 font-bold text-rose-600">9.4</td>
                  <td className="py-2 px-1.5 text-slate-600">Field Test</td>
                  <td className="py-2 px-1.5">
                    <span className="inline-flex items-center bg-sky-100 text-sky-700 font-semibold text-[10px] px-2 py-0.5 rounded-full">
                      Screening
                    </span>
                  </td>
                  <td className="py-2 px-1.5 text-slate-500 text-right whitespace-nowrap">01 Nov 2026, 07:40 PM</td>
                </tr>

                {/* Row 2 */}
                <tr className="hover:bg-slate-50/80 transition">
                  <td className="py-2 px-1.5 font-mono font-medium text-slate-700">RD-2026-03123</td>
                  <td className="py-2 px-1.5 font-medium text-slate-800">B-02</td>
                  <td className="py-2 px-1.5 text-slate-700">Turbidity</td>
                  <td className="py-2 px-1.5 font-bold text-rose-600">12.6 NTU</td>
                  <td className="py-2 px-1.5 text-slate-600">Field Test</td>
                  <td className="py-2 px-1.5">
                    <span className="inline-flex items-center bg-sky-100 text-sky-700 font-semibold text-[10px] px-2 py-0.5 rounded-full">
                      Screening
                    </span>
                  </td>
                  <td className="py-2 px-1.5 text-slate-500 text-right whitespace-nowrap">01 Nov 2026, 06:28 PM</td>
                </tr>

                {/* Row 3 */}
                <tr className="hover:bg-slate-50/80 transition">
                  <td className="py-2 px-1.5 font-mono font-medium text-slate-700">RD-2026-03122</td>
                  <td className="py-2 px-1.5 font-medium text-slate-800">C-01</td>
                  <td className="py-2 px-1.5 text-slate-700">TDS</td>
                  <td className="py-2 px-1.5 font-bold text-rose-600">1,240 mg/L</td>
                  <td className="py-2 px-1.5 text-slate-600">Lab Test</td>
                  <td className="py-2 px-1.5">
                    <span className="inline-flex items-center bg-emerald-100 text-emerald-700 font-semibold text-[10px] px-2 py-0.5 rounded-full">
                      Lab Verified
                    </span>
                  </td>
                  <td className="py-2 px-1.5 text-slate-500 text-right whitespace-nowrap">01 Nov 2026, 05:55 PM</td>
                </tr>

                {/* Row 4 */}
                <tr className="hover:bg-slate-50/80 transition">
                  <td className="py-2 px-1.5 font-mono font-medium text-slate-700">RD-2026-03121</td>
                  <td className="py-2 px-1.5 font-medium text-slate-800">D-03</td>
                  <td className="py-2 px-1.5 text-slate-700">pH</td>
                  <td className="py-2 px-1.5 font-bold text-rose-600">6.3</td>
                  <td className="py-2 px-1.5 text-slate-600">Field Test</td>
                  <td className="py-2 px-1.5">
                    <span className="inline-flex items-center bg-sky-100 text-sky-700 font-semibold text-[10px] px-2 py-0.5 rounded-full">
                      Screening
                    </span>
                  </td>
                  <td className="py-2 px-1.5 text-slate-500 text-right whitespace-nowrap">01 Nov 2026, 05:10 PM</td>
                </tr>

                {/* Row 5 */}
                <tr className="hover:bg-slate-50/80 transition">
                  <td className="py-2 px-1.5 font-mono font-medium text-slate-700">RD-2026-03120</td>
                  <td className="py-2 px-1.5 font-medium text-slate-800">E-05</td>
                  <td className="py-2 px-1.5 text-slate-700">Bacteria</td>
                  <td className="py-2 px-1.5 font-bold text-rose-600">Detected</td>
                  <td className="py-2 px-1.5 text-slate-600">Lab Test</td>
                  <td className="py-2 px-1.5">
                    <span className="inline-flex items-center bg-emerald-100 text-emerald-700 font-semibold text-[10px] px-2 py-0.5 rounded-full">
                      Lab Verified
                    </span>
                  </td>
                  <td className="py-2 px-1.5 text-slate-500 text-right whitespace-nowrap">01 Nov 2026, 03:45 PM</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions (2x2 Grid, ~25% width / 3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Zap className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm">Quick Actions</h3>
          </div>

          <div className="grid grid-cols-2 gap-2.5 my-auto pt-2">
            {/* Submit Reading */}
            <button
              onClick={() => onQuickAction('submit-reading')}
              className="flex flex-col items-center justify-center text-center p-3 rounded-xl border border-slate-200/80 hover:border-blue-400 hover:bg-blue-50/30 hover:shadow-sm transition cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                <Plus className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-xs font-semibold text-slate-800 leading-tight">Submit Reading</span>
            </button>

            {/* Record Response Action */}
            <button
              onClick={() => onQuickAction('record-action')}
              className="flex flex-col items-center justify-center text-center p-3 rounded-xl border border-slate-200/80 hover:border-blue-400 hover:bg-blue-50/30 hover:shadow-sm transition cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                <ClipboardList className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-800 leading-tight">Record Response Action</span>
            </button>

            {/* Manage Rules & Thresholds */}
            <button
              onClick={() => onQuickAction('rules')}
              className="flex flex-col items-center justify-center text-center p-3 rounded-xl border border-slate-200/80 hover:border-blue-400 hover:bg-blue-50/30 hover:shadow-sm transition cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-800 leading-tight">Manage Rules &amp; Thresholds</span>
            </button>

            {/* Upload Lab Evidence */}
            <button
              onClick={() => onQuickAction('upload-evidence')}
              className="flex flex-col items-center justify-center text-center p-3 rounded-xl border border-slate-200/80 hover:border-blue-400 hover:bg-blue-50/30 hover:shadow-sm transition cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                <Upload className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-800 leading-tight">Upload Lab Evidence</span>
            </button>
          </div>
        </div>

        {/* System Status (~25% width / 3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <span className="text-blue-600 font-mono font-bold text-base leading-none">⚡</span>
              <h3 className="font-bold text-slate-900 text-sm">System Status</h3>
            </div>

            <div className="space-y-2 mt-3 text-xs">
              {/* Service 1 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-100" />
                  <span>API Gateway</span>
                </div>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  Operational
                </span>
              </div>

              {/* Service 2 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-100" />
                  <span>Lambda Functions</span>
                </div>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  Operational
                </span>
              </div>

              {/* Service 3 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-100" />
                  <span>DynamoDB</span>
                </div>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  Operational
                </span>
              </div>

              {/* Service 4 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-100" />
                  <span>SNS (Notifications)</span>
                </div>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  Operational
                </span>
              </div>

              {/* Service 5 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-100" />
                  <span>S3 (Evidence)</span>
                </div>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  Operational
                </span>
              </div>

              {/* Service 6 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-100" />
                  <span>CloudFront (Frontend)</span>
                </div>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  Operational
                </span>
              </div>
            </div>
          </div>

          {/* Footer Timestamp + Refresh Button */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 mt-2">
            <span>Last checked: {lastCheckedTime}</span>
            <button
              onClick={handleRefreshStatus}
              className={`p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition ${
                isRefreshingStatus ? 'animate-spin text-blue-600' : ''
              }`}
              title="Refresh system status check"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
