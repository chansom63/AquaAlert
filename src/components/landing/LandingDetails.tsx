import type { FC } from 'react';

// Water quality / technology / about sections of the landing page. The hero's nav links (#quality,
// #technology, #about) scroll to these. Moved out of the old single-file App.tsx unchanged.
type Portal = 'citizen' | 'admin';

const LandingDetails: FC<{ onOpenPortal: (portal: Portal) => void }> = ({ onOpenPortal }) => <>
  <section className="info-section info-section-light" id="quality">
    <div className="info-shell">
      <div className="info-intro"><span className="info-kicker">WATER QUALITY, WITH CONTEXT</span><h2>Numbers matter.<br/><em>So does what they mean.</em></h2><p>Explore reported measurements alongside their units, sample times, and review status. A screening result is one part of the picture; it is not a water safety certificate.</p></div>
      <div className="quality-grid">
        <article><span className="info-icon">01</span><h3>Measurements</h3><p>Review reported parameters such as pH, turbidity, and total dissolved solids when they are available for a source.</p></article>
        <article><span className="info-icon">02</span><h3>Freshness</h3><p>Check when a sample was collected and when the system received it. Missing or older data should be treated as unknown.</p></article>
        <article><span className="info-icon">03</span><h3>Review status</h3><p>See whether a record is marked as screening, under review, or verified, where that information is supplied.</p></article>
      </div>
      <div className="quality-note"><b>How to read a result</b><span>Compare values with the applicable official guidance, check the sample date, and follow current municipal or public health advisories.</span></div>
    </div>
  </section>
  <section className="info-section info-section-deep" id="technology">
    <div className="info-shell technology-layout"><div className="info-intro"><span className="info-kicker">FROM SAMPLE TO PUBLIC UPDATE</span><h2>A clear path<br/><em>from data to action.</em></h2><p>AquaAlert brings source records, submitted measurements, and notices into one place so people can see what is known and what still needs review.</p><button className="info-link-button" onClick={() => onOpenPortal('citizen')}>Explore the dashboard <b>→</b></button></div>
      <ol className="process-list"><li><span>01</span><div><h3>Record a sample</h3><p>A field team records the source, collection time, method, and available measurements.</p></div></li><li><span>02</span><div><h3>Screen and review</h3><p>Submitted values can be screened and flagged for follow-up. Screening does not replace laboratory confirmation.</p></div></li><li><span>03</span><div><h3>Publish an update</h3><p>Source readings and published notices can be presented with dates, status, and plain-language context.</p></div></li></ol>
    </div>
  </section>
  <section className="info-section info-section-light about-section" id="about">
    <div className="info-shell about-layout"><div><span className="info-kicker">BUILT AROUND GWALIOR</span><h2>Local information,<br/><em>made easier to follow.</em></h2><p>The current experience is a Gwalior water information demo, with a ward directory, source views, screening notices, and a response workspace.</p><p className="about-caveat">Some views use illustrative local demo data. Availability, readings, and notices should be confirmed with the relevant authority before making health or service decisions.</p></div><div className="coverage-card"><span className="coverage-number">66</span><b>wards represented</b><p>Ward-level browsing with zone filters and an indicative map view.</p><span className="demo-stamp">DEMO COVERAGE · VERIFY OFFICIAL UPDATES</span><button onClick={() => onOpenPortal('citizen')}>Browse water sources <b>→</b></button></div></div>
  </section>
</>;

export default LandingDetails;
