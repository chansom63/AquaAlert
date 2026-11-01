import type { FC } from 'react';

const OperationsPanel: FC = () => (
  <div className="portal-columns">
    <section className="portal-panel">
      <div className="panel-eyebrow">NOT EXPOSED BY CURRENT LAMBDA</div>
      <h2>Operational tools unavailable</h2>
      <p className="muted-copy">
        CloudWatch log streaming, rule configuration, SNS delivery status, and the T01–T12 acceptance runner are specified in the subsystem docs, but the supplied
        function has no routes for them. They need separate authorized endpoints or AWS console integrations.
      </p>
    </section>
    <section className="portal-panel">
      <div className="panel-eyebrow">AUTHORIZATION STATUS</div>
      <h2>Backend security gate</h2>
      <p className="muted-copy">
        The Lambda handler shown does not validate JWT claims or actor roles, and currently allows wildcard CORS. Do not expose mutation routes publicly until API
        Gateway authorization and exact-origin CORS are configured.
      </p>
    </section>
  </div>
);

export default OperationsPanel;
