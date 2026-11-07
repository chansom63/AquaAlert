import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { useSearchParams } from 'react-router-dom';
import ComplaintSection from '../components/complaints/ComplaintSection';
import PortalLayout from '../components/layout/PortalLayout';
import AlertsPanel from '../components/portal/AlertsPanel';
import InteractiveMapPanel from '../components/portal/InteractiveMapPanel';
import OverviewDashboard from '../components/portal/OverviewDashboard';
import SourcesPanel from '../components/portal/SourcesPanel';
import SourceDetailDrawer from '../components/sources/SourceDetailDrawer';
import AlertDetailDrawer from '../components/alerts/AlertDetailDrawer';
import GwaliorWardOverview from '../components/wards/GwaliorWardOverview';
import { useWaterData } from '../hooks/useWaterData';

const CITIZEN_NAV = ['Overview', 'Interactive Map', 'Sources', 'Alerts', 'Reports'];

const CitizenPage: FC = () => {
  const [page, setPage] = useState('Overview');
  const [drawerSourceId, setDrawerSourceId] = useState<string | null>(null);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const data = useWaterData(page);

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
      admin={false}
      title="Gwalior water monitor"
      kicker="PUBLIC WATER QUALITY · GWALIOR, MADHYA PRADESH"
      description="Explore water source readings and published alerts across Gwalior’s wards."
      nav={CITIZEN_NAV}
      page={page}
      loading={data.loading}
      onPageChange={setPage}
      onRefresh={() => void data.reload()}
      error={data.error}
      notice={data.notice}
      onClearError={() => data.setError('')}
      onClearNotice={() => data.setNotice('')}
    >
      {page === 'Overview' && (
        <>
          <GwaliorWardOverview sources={data.sources} />
          <OverviewDashboard
            admin={false}
            loading={data.loading}
            sources={data.sources}
            alerts={data.alerts}
            readingsCount={data.readings.length}
            onOpenSources={() => setPage('Sources')}
            onOpenAlerts={() => setPage('Alerts')}
            onSelectSource={sourceId => {
              data.setSelected(sourceId);
              setDrawerSourceId(sourceId);
            }}
            onSelectAlert={alertId => {
              handleSelectAlert(alertId);
            }}
          />
        </>
      )}
      {page === 'Interactive Map' && (
        <InteractiveMapPanel
          sources={data.sources}
          selectedSourceId={data.selected}
          onSelectSource={sourceId => {
            data.setSelected(sourceId);
            setDrawerSourceId(sourceId);
          }}
        />
      )}
      {page === 'Sources' && (
        <SourcesPanel
          admin={false}
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
      {page === 'Alerts' && (
        <AlertsPanel
          admin={false}
          loading={data.loadingAlerts}
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
        />
      )}
      {page === 'Reports' && <ComplaintSection reports={data.complaints} onSubmit={data.submitComplaint} />}

      {/* Slide-over Detail Drawer matching user specifications */}
      {drawerSourceId && (
        <SourceDetailDrawer
          sourceId={drawerSourceId}
          onClose={() => setDrawerSourceId(null)}
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
          isStaff={false}
        />
      )}
    </PortalLayout>
  );
};

export default CitizenPage;
