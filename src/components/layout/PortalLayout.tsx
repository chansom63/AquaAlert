import { useState } from 'react';
import type { FC, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Database,
  FlaskConical,
  Home,
  Shield,
  Users,
  LogOut,
  ExternalLink,
  ArrowRight,
  User,
} from 'lucide-react';
import { API } from '../../api/client';
import { useAuth } from '../../features/auth/AuthContext';
import { AuthModal } from '../auth/AuthModal';
import WaterAtmosphere from '../atmosphere/WaterAtmosphere';
import CommonFooter from './CommonFooter';

type PortalLayoutProps = {
  admin: boolean;
  title: string;
  kicker: string;
  description: string;
  nav: string[];
  page: string;
  loading?: boolean;
  onPageChange: (page: string) => void;
  onRefresh: () => void;
  error: string;
  notice: string;
  onClearError: () => void;
  onClearNotice: () => void;
  children: ReactNode;
};

const PortalLayout: FC<PortalLayoutProps> = ({
  admin,
  title,
  kicker,
  description,
  nav,
  page,
  loading = false,
  onPageChange,
  onRefresh,
  error,
  notice,
  onClearError,
  onClearNotice,
  children,
}) => {
  const navigate = useNavigate();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'register'>('signin');
  const { user, isAuthenticated, logout } = useAuth();
  return (
    <main className={`portal-shell ${admin ? 'admin-portal' : 'public-portal'}`}>
      {!admin && <WaterAtmosphere />}
      <header className="portal-top">
        <button className="wordmark" onClick={() => navigate('/')}>
          <span className="wordmark-mark">A</span>AquaAlert <span className="portal-role">{admin ? 'STAFF' : 'PUBLIC'}</span>
        </button>
        <div className="portal-top-right flex items-center gap-2 sm:gap-2.5 flex-wrap">
          {loading ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 text-xs font-mono animate-pulse">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
              <span>Fetching {page}…</span>
            </span>
          ) : API ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-[11px] font-mono font-semibold shadow-xs shadow-emerald-950/40">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <Database className="w-3 h-3 text-emerald-400" />
              <span>LIVE DATABASE</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-[10px] font-mono font-semibold tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>DEMO DATA</span>
            </span>
          )}

          {/* Cognito Auth Account Status Pill */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2 pl-3 pr-1.5 py-1 rounded-full bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/80 text-xs text-white shadow-sm transition">
              <span
                className={`w-2 h-2 rounded-full ${
                  user.role === 'ADMIN'
                    ? 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.8)]'
                    : user.role === 'ANALYST'
                    ? 'bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.8)]'
                    : user.role === 'OPERATOR'
                    ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                    : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                }`}
              />
              <span className="font-semibold text-slate-200 max-w-[140px] truncate">
                {user.name || user.email}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider ${
                  user.role === 'ADMIN'
                    ? 'bg-rose-950/80 text-rose-300 border border-rose-800/70'
                    : user.role === 'ANALYST'
                    ? 'bg-purple-950/80 text-purple-300 border border-purple-800/70'
                    : user.role === 'OPERATOR'
                    ? 'bg-amber-950/80 text-amber-300 border border-amber-800/70'
                    : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/70'
                }`}
              >
                {user.role}
              </span>
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium text-slate-400 hover:text-rose-300 hover:bg-rose-950/60 border border-transparent hover:border-rose-800/60 bg-transparent transition cursor-pointer"
                title="Sign out of account"
              >
                <LogOut className="w-3 h-3" />
                <span>Sign out</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAuthModalMode('signin');
                setAuthModalOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 border border-blue-400/40 shadow-sm shadow-blue-500/20 cursor-pointer transition flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In / Register</span>
            </button>
          )}

          {/* Quick Portal Switch Buttons */}
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-purple-300 bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/30 hover:border-purple-400/50 shadow-xs shadow-purple-950/40 transition cursor-pointer"
            onClick={() => navigate('/lab')}
            title="Open Accredited Central Laboratory Portal"
          >
            <FlaskConical className="w-3.5 h-3.5 text-purple-400" />
            <span>Lab Portal</span>
            <ExternalLink className="w-3 h-3 text-purple-400/70 ml-0.5" />
          </button>

          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800/90 border border-slate-700/60 hover:border-slate-600 shadow-xs transition cursor-pointer"
            onClick={() => navigate('/')}
            title="Return to AquaAlert Home"
          >
            <Home className="w-3.5 h-3.5 text-slate-400" />
            <span>Home</span>
          </button>

          {admin ? (
            <button
              type="button"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-sky-200 bg-sky-950/40 hover:bg-sky-900/60 border border-sky-500/40 hover:border-sky-400/60 shadow-xs shadow-sky-950/30 transition cursor-pointer"
              onClick={() => navigate('/user')}
              title="Switch to Citizen Public Surveillance View"
            >
              <Users className="w-3.5 h-3.5 text-sky-400" />
              <span>Citizen View</span>
              <ArrowRight className="w-3 h-3 text-sky-400 ml-0.5" />
            </button>
          ) : (
            <button
              type="button"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-cyan-200 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/40 hover:border-cyan-400/60 shadow-xs shadow-cyan-950/30 transition cursor-pointer"
              onClick={() => navigate('/admin')}
              title="Open Municipal Administration Portal"
            >
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span>Admin Portal</span>
              <ArrowRight className="w-3 h-3 text-cyan-400 ml-0.5" />
            </button>
          )}
        </div>
      </header>
      <div className="portal-content">
        <div className="portal-heading">
          <div>
            <div className="portal-kicker">{kicker}</div>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          <button className="outline-button refresh-button" onClick={onRefresh}>
            ↻ Refresh data
          </button>
        </div>
        <div className="city-context">
          <span className="city-pin">⌖</span>
          <div>
            <b>Gwalior Municipal Corporation</b>
            <small>66 wards · 25 administrative zones · Chambal–Sindh basin</small>
          </div>
          <span className="city-context-tag">CITY VIEW</span>
        </div>
        <nav className="portal-nav">
          {nav.map(item => (
            <button key={item} className={page === item ? 'active' : ''} onClick={() => onPageChange(item)}>
              {item}
            </button>
          ))}
        </nav>
        <div className="live-banner">
          <span>
            <i /> {API ? 'LIVE API' : 'GWALIOR DEMO PREVIEW'}
          </span>
          <small>
            {API ? API : 'Showing illustrative records from the local Gwalior ward dataset · connect VITE_API_BASE_URL for live records'}
          </small>
        </div>
        {error && (
          <div className="portal-message error-message">
            {error}
            <button onClick={onClearError}>×</button>
          </div>
        )}
        {notice && (
          <div className="portal-message success-message">
            {notice}
            <button onClick={onClearNotice}>×</button>
          </div>
        )}
        {children}
        <CommonFooter />
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
      />
    </main>
  );
};

export default PortalLayout;
