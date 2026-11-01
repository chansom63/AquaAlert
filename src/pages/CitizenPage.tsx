import { useState } from 'react';
import type { FC } from 'react';
import ComplaintSection from '../components/complaints/ComplaintSection';
import PortalLayout from '../components/layout/PortalLayout';
import AlertsPanel from '../components/portal/AlertsPanel';
import InteractiveMapPanel from '../components/portal/InteractiveMapPanel';
import OverviewDashboard from '../components/portal/OverviewDashboard';
import SourcesPanel from '../components/portal/SourcesPanel';
import SourceDetailDrawer from '../components/sources/SourceDetailDrawer';
import GwaliorWardOverview from '../components/wards/GwaliorWardOverview';
import { useWaterData } from '../hooks/useWaterData';

const CITIZEN_NAV = ['Overview', 'Interactive Map', 'Sources', 'Alerts', 'Reports'];

const CitizenPage: FC = () => {
  const [page, setPage] = useState('Overview');
  const [drawerSourceId, setDrawerSourceId] = useState<string | null>(null);
  const data = useWaterData();

  return (
    <PortalLayout
      admin={false}
      title="Gwalior water monitor"
      kicker="PUBLIC WATER QUALITY · GWALIOR, MADHYA PRADESH"
      description="Explore water source readings and published alerts across Gwalior’s wards."
      nav={CITIZEN_NAV}
      page={page}
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
            onSelectAlert={sourceId => {
              data.setSelected(sourceId);
              setDrawerSourceId(sourceId);
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
          alerts={data.alerts}
          sources={data.sources}
          busy={data.busy}
          onSelect={sourceId => {
            data.setSelected(sourceId);
            setDrawerSourceId(sourceId);
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
    </PortalLayout>
  );
};

export default CitizenPage;
