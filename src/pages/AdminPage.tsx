import { useState } from 'react';
import type { FC } from 'react';
import PortalLayout from '../components/layout/PortalLayout';
import AlertsPanel from '../components/portal/AlertsPanel';
import OverviewDashboard from '../components/portal/OverviewDashboard';
import SourcesPanel from '../components/portal/SourcesPanel';
import SourceDetailDrawer from '../components/sources/SourceDetailDrawer';
import { useWaterData } from '../hooks/useWaterData';
import LabReportsPanel from './admin/LabReportsPanel';
import OperationsPanel from './admin/OperationsPanel';
import SubmitReadingPanel from './admin/SubmitReadingPanel';

const ADMIN_NAV = ['Overview', 'Sources', 'Alerts & actions', 'Submit reading', 'Lab reports', 'Operations'];

const AdminPage: FC = () => {
  const [page, setPage] = useState('Overview');
  const [drawerSourceId, setDrawerSourceId] = useState<string | null>(null);
  const data = useWaterData();

  return (
    <PortalLayout
      admin
      title="Gwalior water operations"
      kicker="GWALIOR MUNICIPAL WATER · OPERATIONS"
      description="Review source coverage, screening alerts, and incoming field measurements across the city."
      nav={ADMIN_NAV}
      page={page}
      onPageChange={setPage}
      onRefresh={() => void data.reload()}
      error={data.error}
      notice={data.notice}
      onClearError={() => data.setError('')}
      onClearNotice={() => data.setNotice('')}
    >
      {page === 'Overview' && (
        <OverviewDashboard
          admin
          loading={data.loading}
          sources={data.sources}
          alerts={data.alerts}
          readingsCount={data.readings.length}
          onOpenSources={() => setPage('Sources')}
          onOpenAlerts={() => setPage('Alerts & actions')}
          onSelectSource={sourceId => {
            data.setSelected(sourceId);
            setDrawerSourceId(sourceId);
          }}
          onSelectAlert={sourceId => {
            data.setSelected(sourceId);
            setDrawerSourceId(sourceId);
          }}
        />
      )}
      {page === 'Sources' && (
        <SourcesPanel
          admin
          loading={data.loading}
          sources={data.visibleSources}
          areas={data.GWALIOR_AREAS}
          area={data.area}
          query={data.query}
          selectedSource={data.selectedSource}
          readings={data.readings}
          onAreaChange={data.setArea}
          onQueryChange={data.setQuery}
          onSelect={sourceId => {
            data.setSelected(sourceId);
            setDrawerSourceId(sourceId);
          }}
        />
      )}
      {page === 'Alerts & actions' && (
        <AlertsPanel
          admin
          alerts={data.alerts}
          sources={data.sources}
          busy={data.busy}
          onSelect={sourceId => {
            data.setSelected(sourceId);
            setDrawerSourceId(sourceId);
          }}
          onSubmitAction={data.submitAction}
        />
      )}
      {page === 'Submit reading' && <SubmitReadingPanel sources={data.sources} busy={data.busy} onSubmit={data.submitReading} />}
      {page === 'Lab reports' && <LabReportsPanel sources={data.sources} busy={data.busy} onSubmit={data.uploadReport} />}
      {page === 'Operations' && <OperationsPanel />}

      {/* Slide-over Detail Drawer matching user specifications */}
      {drawerSourceId && (
        <SourceDetailDrawer
          sourceId={drawerSourceId}
          onClose={() => setDrawerSourceId(null)}
          isStaff={true}
          onOpenSubmitReading={srcId => {
            setDrawerSourceId(null);
            setPage('Submit reading');
            if (srcId) data.setSelected(srcId);
          }}
        />
      )}
    </PortalLayout>
  );
};

export default AdminPage;
