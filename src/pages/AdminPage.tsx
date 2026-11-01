import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { useSearchParams } from 'react-router-dom';
import PortalLayout from '../components/layout/PortalLayout';
import AlertsPanel from '../components/portal/AlertsPanel';
import OverviewDashboard from '../components/portal/OverviewDashboard';
import SourcesPanel from '../components/portal/SourcesPanel';
import SourceDetailDrawer from '../components/sources/SourceDetailDrawer';
import AlertDetailDrawer from '../components/alerts/AlertDetailDrawer';
import { useWaterData } from '../hooks/useWaterData';
import LabReportsPanel from './admin/LabReportsPanel';
import OperationsPanel from './admin/OperationsPanel';
import SubmitReadingPanel from './admin/SubmitReadingPanel';

const ADMIN_NAV = ['Overview', 'Sources', 'Alerts & actions', 'Submit reading', 'Lab reports', 'Operations'];

const AdminPage: FC = () => {
  const [page, setPage] = useState('Overview');
  const [drawerSourceId, setDrawerSourceId] = useState<string | null>(null);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const data = useWaterData();

  const alertParam = searchParams.get('alert');
  useEffect(() => {
    if (alertParam) {
      setSelectedAlertId(alertParam);
    }
  }, [alertParam]);

  const handleCloseAlertDrawer = () => {
    setSelectedAlertId(null);
    if (searchParams.has('alert')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('alert');
      setSearchParams(nextParams, { replace: true });
    }
  };

  const handleSelectAlert = (alertId: string) => {
    setSelectedAlertId(alertId);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('alert', alertId);
    setSearchParams(nextParams, { replace: true });
  };

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
          onSelectAlert={alertId => {
            handleSelectAlert(alertId);
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
          onSelectAlert={alert => {
            handleSelectAlert(alert.alertId);
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

      {/* Alert Detail Drawer matching user specifications */}
      {selectedAlertId && (
        <AlertDetailDrawer
          alertId={selectedAlertId}
          alerts={data.alerts}
          sources={data.sources}
          onClose={handleCloseAlertDrawer}
          onOpenSource={sourceId => {
            handleCloseAlertDrawer();
            data.setSelected(sourceId);
            setDrawerSourceId(sourceId);
          }}
          isStaff={true}
        />
      )}
    </PortalLayout>
  );
};

export default AdminPage;
