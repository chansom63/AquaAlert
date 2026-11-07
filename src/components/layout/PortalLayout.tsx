import type { FC, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../../api/client';
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
    </main>
  );
};

export default PortalLayout;
