import { useState } from 'react';
import type { FC, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
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
        <div className="portal-top-right">
          {loading ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 text-xs font-mono animate-pulse">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
              <span>Fetching {page}…</span>
            </span>
          ) : API ? (
            <span className="live-pill" style={{ background: '#059669', color: '#fff', padding: '4px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 600 }}>
              ● LIVE DATABASE
            </span>
          ) : (
            <span className="demo-pill">DEMO DATA</span>
          )}
          {/* Cognito Auth Account Status Pill */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700/80 text-xs text-white">
              <span
                className={`w-2 h-2 rounded-full ${
                  user.role === 'ADMIN'
                    ? 'bg-rose-400'
                    : user.role === 'ANALYST'
                    ? 'bg-purple-400'
                    : user.role === 'OPERATOR'
                    ? 'bg-amber-400'
                    : 'bg-emerald-400'
                }`}
              />
              <span className="font-semibold text-slate-200 max-w-[130px] truncate">
                {user.name || user.email}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                  user.role === 'ADMIN'
                    ? 'bg-rose-950 text-rose-300 border border-rose-800/60'
                    : user.role === 'ANALYST'
                    ? 'bg-purple-950 text-purple-300 border border-purple-800/60'
                    : user.role === 'OPERATOR'
                    ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                }`}
              >
                {user.role}
              </span>
              <button
                type="button"
                onClick={logout}
                className="text-[11px] text-slate-400 hover:text-rose-300 hover:underline cursor-pointer ml-1"
                title="Sign out"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAuthModalMode('signin');
                setAuthModalOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 border border-blue-400/40 shadow-sm shadow-blue-500/20 cursor-pointer transition flex items-center gap-1.5"
            >
              <span>Sign In / Register</span>
            </button>
          )}

          <button className="back-link" onClick={() => navigate('/upload-document')}>
            Upload Reports ↗
          </button>
          <button className="back-link" onClick={() => navigate('/')}>
            ← Home
          </button>
          {admin ? (
            <button className="back-link" onClick={() => navigate('/user')}>
              Citizen View →
            </button>
          ) : (
            <button className="back-link" onClick={() => navigate('/admin')}>
              Admin Portal →
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
