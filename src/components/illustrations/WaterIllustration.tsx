import type { FC } from 'react';

const WaterIllustration: FC<{ type: 'test' | 'alert' | 'response' }> = ({ type }) => (
  <svg className={`journey-art journey-art-${type}`} viewBox="0 0 320 210" aria-hidden="true">
    <defs>
      <linearGradient id={`water-${type}`} x1="0" x2="0" y1="0" y2="1">
        <stop stopColor="#43e5ff" />
        <stop offset="1" stopColor="#087bb8" />
      </linearGradient>
      <radialGradient id={`glow-${type}`}>
        <stop stopColor={type === 'alert' ? '#ff4267' : type === 'response' ? '#00f5c8' : '#00d9ff'} stopOpacity=".32" />
        <stop offset="1" stopColor="#00d9ff" stopOpacity="0" />
      </radialGradient>
    </defs>
    {type === 'test' && (
      <>
        <ellipse cx="113" cy="165" rx="72" ry="14" fill="#00bfe8" opacity=".12" />
        <path d="M82 105h62l-5 58q-26 14-52 0z" fill="#0c3150" stroke="#51dcff" strokeWidth="3" />
        <path d="M84 131q28 9 58 0l-3 31q-25 14-52 0z" fill={`url(#water-${type})`} opacity=".88" />
        <path d="M75 104q38-12 76 0" fill="none" stroke="#8af1ff" strokeWidth="4" />
        <path d="m73 33 12-10 30 39-11 10z" fill="#42dfff" stroke="#a7f5ff" strokeWidth="2" />
        <path d="m105 72 8 14" stroke="#59e6ff" strokeWidth="3" />
        <path d="M115 88q8 10 0 15-8-5 0-15" fill="#5ceaff" />
        <rect x="174" y="69" width="111" height="78" rx="10" fill="#082846" stroke="#168bb4" />
        <text x="184" y="91" fill="#c5ecf7" fontSize="11">
          pH
        </text>
        <text x="184" y="116" fill="#c5ecf7" fontSize="11">
          TDS
        </text>
        <text x="184" y="139" fill="#c5ecf7" fontSize="11">
          Turbidity
        </text>
        {[0, 1, 2].map(n => (
          <g key={n}>
            <rect x="228" y={83 + n * 23} width="45" height="7" rx="4" fill="#114767" />
            <rect x="228" y={83 + n * 23} width={n === 1 ? 27 : 36} height="7" rx="4" fill="#15cde8" />
          </g>
        ))}
      </>
    )}
    {type === 'alert' && (
      <>
        <circle cx="160" cy="105" r="89" fill={`url(#glow-${type})`} />
        <circle cx="160" cy="105" r="69" fill="none" stroke="#ff385c" opacity=".22" />
        <circle cx="160" cy="105" r="49" fill="none" stroke="#ff4566" opacity=".4" />
        <path d="M35 122c20 0 21-23 39-23s18 24 36 24 19-24 38-24m99 0c17 0 20 24 37 24s17-24 39-24" fill="none" stroke="#ff4264" strokeWidth="2" opacity=".8" />
        <path d="M132 127v-26a28 28 0 0 1 56 0v26l10 13h-76z" fill="#ff4566" stroke="#ffc0cb" strokeWidth="3" />
        <path d="M151 93h18l-3 25h-12z" fill="#fff" />
        <circle cx="160" cy="126" r="3.5" fill="white" />
        <path d="M151 143a9 9 0 0 0 18 0" fill="#ff6b83" stroke="#ffc0cb" strokeWidth="2" />
      </>
    )}
    {type === 'response' && (
      <>
        <path d="M0 137 47 112 84 126 125 83 164 99 207 57 250 77 292 32 320 19" fill="none" stroke="#00dcc1" strokeWidth="2" opacity=".7" />
        {[[47, 112], [125, 83], [207, 57], [250, 77], [292, 32]].map(([x, y]) => (
          <circle key={x} cx={x} cy={y} r="4" fill="#00f4d2" />
        ))}
        <circle cx="160" cy="108" r="61" fill="#00d9b522" stroke="#00f0c5" strokeWidth="2" />
        <path d="M160 72c-13 20-23 32-23 44a23 23 0 0 0 46 0c0-12-10-24-23-44" fill={`url(#water-${type})`} stroke="#9bfff0" strokeWidth="2" />
        <circle cx="198" cy="145" r="18" fill="#00cda8" stroke="#7dffe9" strokeWidth="2" />
        <path d="m190 145 5 5 11-12" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </>
    )}
  </svg>
);

export default WaterIllustration;
