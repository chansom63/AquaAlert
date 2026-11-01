import type { FC } from 'react';

const CommonFooter: FC = () => (
  <footer className="site-footer">
    <div className="site-footer-main">
      <div className="footer-brand">
        <div className="footer-logo">
          <span>∿</span> AQUA<span>ALERT</span>
        </div>
        <small>GWALIOR WATER QUALITY</small>
        <p>Municipal water quality information for Gwalior, Madhya Pradesh. Read source data, screening alerts, and public updates with clear context.</p>
        <div className="footer-badges">
          <span>⌁ &nbsp; CITY WATER VIEW</span>
          <span>◇ &nbsp; DEMO DATA</span>
        </div>
      </div>
      <div className="footer-column">
        <b>WATER NETWORK</b>
        <span>Tigra Dam feeder</span>
        <span>Gandhi Nagar WTP</span>
        <span>Maharaj Bada · Lashkar</span>
        <span>Swarnrekha corridor</span>
        <span>Morar water sources</span>
      </div>
      <div className="footer-column">
        <b>DATA & STANDARDS</b>
        <span>Source readings</span>
        <span>Screening alerts</span>
        <span>Verification status</span>
        <span>IS 10500 reference</span>
        <small>Thresholds shown are informational and require authority approval.</small>
      </div>
      <div className="footer-contact">
        <b>GWALIOR WATER INFORMATION</b>
        <div className="footer-contact-card">
          <span>Municipal water helpline</span>
          <strong>1800-233-0195</strong>
          <small>Confirm service availability with Gwalior Municipal Corporation.</small>
        </div>
        <span>Gwalior, Madhya Pradesh, India</span>
      </div>
    </div>
    <div className="site-footer-bottom">
      <span>© 2026 AquaAlert · Gwalior Water Quality Information</span>
      <span>DEMO DATA · Not an official water safety certification</span>
    </div>
  </footer>
);

export default CommonFooter;
