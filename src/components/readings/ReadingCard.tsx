import type { FC } from 'react';
import { date, paramLabel } from '../../api/client';
import type { Reading } from '../../types/water';

const ReadingCard: FC<{ reading: Reading }> = ({ reading }) => (
  <article className="reading-card">
    <div>
      <b>{reading.readingId}</b>
      <span>
        {reading.isDemo && <em>DEMO</em>} {reading.verificationStatus || 'SCREENING'} · {reading.method || 'Method not recorded'}
      </span>
    </div>
    <p>Collected {date(reading.collectedAt)}</p>
    <p>Received {date(reading.receivedAt)}</p>
    <div className="reading-params">
      {Object.entries(reading.parameters || {}).map(([name, p]) => (
        <span key={name}>
          {paramLabel(name)}{' '}
          <b>
            {p.value} {p.unit}
          </b>
        </span>
      ))}
    </div>
  </article>
);

export default ReadingCard;
