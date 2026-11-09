import type { FC } from 'react';

export type WaterIllustrationType = 'test' | 'alert' | 'response' | 'citizen' | 'admin' | 'lab';

const WaterIllustration: FC<{ type: WaterIllustrationType }> = ({ type }) => (
  <svg className={`journey-art journey-art-${type}`} viewBox="0 0 320 210" aria-hidden="true">
    <defs>
      <linearGradient id={`water-${type}`} x1="0" x2="0" y1="0" y2="1">
        <stop
          stopColor={
            type === 'admin'
              ? '#ff637e'
              : type === 'lab'
              ? '#c084fc'
              : '#43e5ff'
          }
        />
        <stop
          offset="1"
          stopColor={
            type === 'admin'
              ? '#be123c'
              : type === 'lab'
              ? '#7e22ce'
              : '#087bb8'
          }
        />
      </linearGradient>
      <radialGradient id={`glow-${type}`}>
        <stop
          stopColor={
            type === 'alert' || type === 'admin'
              ? '#ff4267'
              : type === 'lab'
              ? '#c084fc'
              : type === 'response'
              ? '#00f5c8'
              : '#00d9ff'
          }
          stopOpacity=".35"
        />
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
    {type === 'citizen' && (
      <>
        {/* Glow backdrop */}
        <circle cx="160" cy="105" r="95" fill={`url(#glow-${type})`} />

        {/* Mobile Telemetry Panel Frame */}
        <rect x="95" y="28" width="130" height="155" rx="18" fill="#071b34" stroke="#22d3ee" strokeWidth="2.5" />
        <rect x="135" y="34" width="50" height="4" rx="2" fill="#0f3d64" />

        {/* Radar & GIS grid rings */}
        <circle cx="160" cy="85" r="38" fill="none" stroke="#06b6d4" strokeWidth="1" strokeDasharray="3 3" opacity=".4" />
        <circle cx="160" cy="85" r="22" fill="#0891b222" stroke="#22d3ee" strokeWidth="1.5" />

        {/* Map Location Pin for Gwalior Ward */}
        <path d="M160 67a10 10 0 0 0-10 10c0 7 10 16 10 16s10-9 10-16a10 10 0 0 0-10-10z" fill="#06b6d4" stroke="#67e8f9" strokeWidth="1.5" />
        <circle cx="160" cy="77" r="3.5" fill="#fff" />

        {/* Telemetry Status Pill */}
        <rect x="108" y="112" width="104" height="26" rx="8" fill="#042340" stroke="#0284c7" strokeWidth="1.5" />
        <circle cx="120" cy="125" r="4" fill="#10b981" />
        <text x="130" y="128" fill="#a5f3fc" fontSize="9" fontWeight="bold" fontFamily="monospace">
          WARD 14 · SAFE
        </text>
        <rect x="108" y="145" width="104" height="18" rx="6" fill="#0f2b4c" />
        <text x="116" y="157" fill="#7dd3fc" fontSize="8" fontFamily="monospace">
          pH 7.2 · Turb 0.4 NTU
        </text>

        {/* Floating Citizen Protection Shield on Left */}
        <circle cx="68" cy="135" r="24" fill="#061e38" stroke="#38bdf8" strokeWidth="2" />
        <path d="M68 120c-5 8-9 13-9 18a9 9 0 0 0 18 0c0-5-4-10-9-18z" fill={`url(#water-${type})`} />
        <circle cx="83" cy="148" r="8" fill="#10b981" stroke="#6ee7b7" strokeWidth="1.5" />
        <path d="m80 148 2 2 4-4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      </>
    )}
    {type === 'admin' && (
      <>
        {/* Glow backdrop */}
        <circle cx="160" cy="105" r="95" fill={`url(#glow-${type})`} />

        {/* Municipal Console Frame */}
        <rect x="58" y="38" width="204" height="136" rx="14" fill="#09142e" stroke="#f43f5e" strokeWidth="2.5" />
        <path d="M58 66h204" stroke="#1e2954" strokeWidth="2" />

        {/* 3 Console Status Lights */}
        <circle cx="74" cy="52" r="3.5" fill="#f43f5e" />
        <circle cx="86" cy="52" r="3.5" fill="#f59e0b" />
        <circle cx="98" cy="52" r="3.5" fill="#10b981" />
        <text x="112" y="55" fill="#94a3b8" fontSize="8" fontWeight="bold" fontFamily="monospace">
          MUNICIPAL CONTROL ROOM
        </text>

        {/* Central Shield with Key / Lock */}
        <path d="M125 78h30l5 22c0 22-20 32-20 32s-20-10-20-32z" fill="#1e1b4b" stroke="#f43f5e" strokeWidth="2" />
        <circle cx="140" cy="98" r="7" fill="#fbbf24" />
        <rect x="138" y="103" width="4" height="12" rx="1" fill="#fbbf24" />
        <rect x="140" y="110" width="5" height="3" fill="#fbbf24" />

        {/* Sliders / Threshold limits on the right */}
        {[0, 1, 2].map(n => (
          <g key={n}>
            <rect x="175" y={82 + n * 24} width="72" height="5" rx="2.5" fill="#1e2954" />
            <rect
              x="175"
              y={82 + n * 24}
              width={n === 0 ? 52 : n === 1 ? 38 : 60}
              height="5"
              rx="2.5"
              fill={n === 0 ? '#f43f5e' : n === 1 ? '#38bdf8' : '#10b981'}
            />
            <circle
              cx={175 + (n === 0 ? 52 : n === 1 ? 38 : 60)}
              cy={84.5 + n * 24}
              r="5"
              fill="#fff"
              stroke="#f43f5e"
              strokeWidth="1.5"
            />
          </g>
        ))}

        {/* Pulse Telemetry Wave on bottom */}
        <path d="M72 154h30l6-12 8 20 8-16 6 8h35" fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" />
        <circle cx="165" cy="154" r="3" fill="#10b981" />
        <text x="173" y="157" fill="#6ee7b7" fontSize="8" fontFamily="monospace">
          ALL 66 WARDS ONLINE
        </text>
      </>
    )}
    {type === 'lab' && (
      <>
        {/* Glow backdrop */}
        <circle cx="160" cy="105" r="95" fill={`url(#glow-${type})`} />

        {/* Erlenmeyer Flask on Left */}
        {/* Neck */}
        <rect x="76" y="52" width="22" height="34" rx="2" fill="#0d1436" stroke="#c084fc" strokeWidth="2.5" />
        <rect x="72" y="48" width="30" height="6" rx="2" fill="#7e22ce" stroke="#c084fc" strokeWidth="1.5" />
        {/* Conical Flask Body */}
        <path d="M76 84 46 152a8 8 0 0 0 7 11h68a8 8 0 0 0 7-11l-30-68z" fill="#0d1436" stroke="#c084fc" strokeWidth="2.5" />
        {/* Liquid inside flask with meniscus */}
        <path d="M57 126 47 149a6 6 0 0 0 5 9h70a6 6 0 0 0 5-9l-10-23c-11 5-23 0-35 4s-24-4-35-4z" fill={`url(#water-${type})`} opacity=".85" />
        {/* Graduation lines */}
        <path d="M84 100h10M81 114h14M77 130h16M74 144h18" stroke="#e9d5ff" strokeWidth="1.5" strokeLinecap="round" opacity=".7" />
        {/* Effervescent bubbles */}
        <circle cx="82" cy="142" r="2.5" fill="#fff" opacity=".8" />
        <circle cx="94" cy="134" r="3.5" fill="#fff" opacity=".7" />
        <circle cx="86" cy="120" r="2" fill="#fff" opacity=".9" />

        {/* Analytical Assay Certificate Card on Right */}
        <rect x="146" y="44" width="134" height="128" rx="12" fill="#091330" stroke="#818cf8" strokeWidth="2" />
        {/* NABL Badge header */}
        <rect x="156" y="54" width="84" height="16" rx="4" fill="#3b0764" stroke="#a855f7" strokeWidth="1" />
        <text x="162" y="66" fill="#e9d5ff" fontSize="8" fontWeight="bold" fontFamily="monospace">
          NABL TC-8491
        </text>

        {/* Chemical Parameter Test Rows */}
        <text x="156" y="86" fill="#cbd5e1" fontSize="9" fontWeight="600">
          Chemical Assay
        </text>
        <text x="156" y="102" fill="#a5b4fc" fontSize="8">
          pH 7.35 · Free Cl 0.4mg/L
        </text>
        <text x="156" y="116" fill="#a5b4fc" fontSize="8">
          Turbidity 0.6 NTU (Nominal)
        </text>
        <text x="156" y="130" fill="#a5b4fc" fontSize="8">
          Faecal Coliform: 0 CFU
        </text>

        {/* Certified Stamp */}
        <circle cx="250" cy="142" r="16" fill="#581c87" stroke="#c084fc" strokeWidth="2" />
        <path d="m243 142 4 4 9-9" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <text x="250" y="166" textAnchor="middle" fill="#c084fc" fontSize="7" fontWeight="bold" fontFamily="monospace">
          ISO 17025
        </text>
      </>
    )}
  </svg>
);

export default WaterIllustration;

