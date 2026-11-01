import type { FC } from 'react';

const Status: FC<{ value: string }> = ({ value }) => <span className="source-status">{value.replace(/_/g, ' ')}</span>;

export default Status;
