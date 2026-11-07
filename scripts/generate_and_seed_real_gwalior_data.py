#!/usr/bin/env python3
"""Generate and seed realistic municipal water monitoring data for Gwalior into DynamoDB."""
from __future__ import annotations

import argparse
import json
import os
import random
import shutil
import subprocess
from decimal import Decimal
from pathlib import Path

import boto3
from boto3.dynamodb.conditions import Attr
from botocore.exceptions import ClientError

ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = ROOT / 'backend' / '.env'
WARDS_PATH = ROOT / 'backend' / 'seed' / 'wards_base.json'
OUTPUT_DATA_PATH = ROOT / 'backend' / 'seed' / 'gwalior_realistic_records.json'

TABLE_SETTINGS = {
    'WaterSources': 'WATER_SOURCES_TABLE',
    'WaterReadings': 'WATER_READINGS_TABLE',
    'Alerts': 'ALERTS_TABLE',
    'ResponseActions': 'RESPONSE_ACTIONS_TABLE',
}


def load_local_env():
    if not ENV_PATH.exists():
        return
    for raw in ENV_PATH.read_text(encoding='utf-8').splitlines():
        line = raw.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, value = line.split('=', 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def resolve_credentials(profile: str | None = None) -> dict[str, str]:
    access = os.environ.get('AWS_ACCESS_KEY_ID')
    secret = os.environ.get('AWS_SECRET_ACCESS_KEY')
    if access and secret:
        opts = {'aws_access_key_id': access, 'aws_secret_access_key': secret}
        if os.environ.get('AWS_SESSION_TOKEN'):
            opts['aws_session_token'] = os.environ['AWS_SESSION_TOKEN']
        return opts

    target_profile = profile or os.environ.get('AWS_PROFILE') or 'aquaalert'
    for candidate in [target_profile, 'aquaalert-dev', 'default']:
        if not candidate:
            continue
        try:
            session = boto3.Session(profile_name=candidate)
            creds = session.get_credentials()
            if creds:
                frozen = creds.get_frozen_credentials()
                if frozen and frozen.access_key:
                    opts = {
                        'aws_access_key_id': frozen.access_key,
                        'aws_secret_access_key': frozen.secret_key,
                    }
                    if frozen.token:
                        opts['aws_session_token'] = frozen.token
                    return opts
        except Exception:
            pass

        # Fallback to aws CLI export-credentials for SSO / login_session profiles
        aws_bin = shutil.which('aws') or '/snap/bin/aws'
        if os.path.exists(aws_bin):
            try:
                proc = subprocess.run(
                    [aws_bin, 'configure', 'export-credentials', '--profile', candidate],
                    capture_output=True,
                    text=True,
                    timeout=5,
                )
                if proc.returncode == 0 and proc.stdout:
                    data = json.loads(proc.stdout)
                    opts = {
                        'aws_access_key_id': data['AccessKeyId'],
                        'aws_secret_access_key': data['SecretAccessKey'],
                    }
                    if data.get('SessionToken'):
                        opts['aws_session_token'] = data['SessionToken']
                    return opts
            except Exception:
                pass

    return {}


def determine_source_type(name: str) -> str:
    n = name.lower()
    if 'borewell' in n or 'tubewell' in n:
        return 'MUNICIPAL_TUBEWELL'
    if 'intake' in n or 'conduit' in n:
        return 'SURFACE_INTAKE'
    if 'reservoir' in n or 'overhead' in n or 'tank' in n:
        return 'STORAGE_RESERVOIR'
    if 'substation' in n or 'distribution' in n or 'feeder' in n or 'pipeline' in n:
        return 'DISTRIBUTION_PIPELINE'
    if 'hand pump' in n:
        return 'COMMUNITY_HAND_PUMP'
    if 'booster' in n or 'pumping' in n:
        return 'BOOSTER_PUMP'
    return 'MUNICIPAL_SOURCE'


def generate_dataset():
    random.seed(42)  # reproducible authentic data
    with WARDS_PATH.open(encoding='utf-8') as f:
        wards = json.load(f)

    water_sources = []
    water_readings = []
    alerts = []
    response_actions = []

    # Map of wardNumber to list of readings
    ward_readings_map: dict[int, list[dict]] = {}

    for w in wards:
        num = w['wardNumber']
        source_id = f"gmc-ward-{num:02d}"
        source_type = determine_source_type(w['waterSource'])

        status_map = {
            'OPTIMAL': 'ACTIVE',
            'NORMAL': 'ACTIVE',
            'ATTENTION': 'ADVISORY',
            'CRITICAL': 'CRITICAL_ADVISORY'
        }
        pub_status = status_map.get(w.get('status', 'NORMAL'), 'ACTIVE')

        # Base readings
        base_tds = float(w['tds'].replace(' mg/L', '').strip())
        base_cl = float(w['chlorine'].replace(' mg/L', '').strip())
        base_tur = float(w['turbidity'].replace(' NTU', '').strip())
        base_ph = float(w['pH'].strip())

        source_item = {
            'sourceId': source_id,
            'name': f"Ward {num:02d} - {w['waterSource']}",
            'district': 'Gwalior',
            'locality': w['locality'],
            'wardNumber': num,
            'zoneId': w['zoneId'],
            'zoneName': w['zoneName'],
            'population': w['population'],
            'sourceType': source_type,
            'publicStatus': pub_status,
            'latitude': round(w['center']['lat'], 5),
            'longitude': round(w['center']['lng'], 5),
            'lastReadingAt': '2026-11-04T10:30:00Z',
            'isDemo': True,
        }
        water_sources.append(source_item)

        # Generate 4 readings over 4 days: Nov 1, 2, 3, 4
        ward_readings_map[num] = []
        timestamps = [
            ("2026-11-01T08:30:00Z", "2026-11-01T08:35:00Z", "RD-2026-W{:02d}-01", "LAB_TEST", "LAB_VERIFIED"),
            ("2026-11-02T11:15:00Z", "2026-11-02T11:20:00Z", "RD-2026-W{:02d}-02", "FIELD_SCREENING", "SCREENING"),
            ("2026-11-03T14:40:00Z", "2026-11-03T14:45:00Z", "RD-2026-W{:02d}-03", "FIELD_SCREENING", "SCREENING"),
            ("2026-11-04T10:30:00Z", "2026-11-04T10:35:00Z", "RD-2026-W{:02d}-04", "FIELD_SCREENING", "SCREENING"),
        ]

        for idx, (col_time, rec_time, r_id_fmt, meth, ver) in enumerate(timestamps):
            r_id = r_id_fmt.format(num)
            r_key = f"{col_time}#{r_id}"

            # Small normal variation
            tds_val = round(base_tds + random.uniform(-15.0, 15.0), 1)
            cl_val = round(max(0.02, base_cl + random.uniform(-0.06, 0.06)), 2)
            tur_val = round(max(0.15, base_tur + random.uniform(-0.10, 0.10)), 2)
            ph_val = round(base_ph + random.uniform(-0.15, 0.15), 2)
            fluoride_val = round(0.70 + random.uniform(-0.15, 0.15), 2)
            nitrate_val = round(16.0 + random.uniform(-4.0, 4.0), 1)
            hardness_val = round(210.0 + random.uniform(-20.0, 20.0), 1)
            bacteria_val = "Absent"

            # Special anomaly injections for target wards
            if num == 14 and idx >= 2:  # Maharaj Bada
                tds_val = 790.0 if idx == 3 else 760.0
                tur_val = 4.20 if idx == 3 else 3.80
                bacteria_val = "Detected"
                ph_val = 7.9
            elif num == 28 and idx >= 2:  # Sikandar Kampoo
                cl_val = 0.05
                tur_val = 1.65
            elif num == 7 and idx >= 2:  # Gol Pahariya
                tur_val = 5.80 if idx == 3 else 4.60
            elif num == 1 and idx >= 3:  # Hazira Industrial
                ph_val = 8.90
            elif num == 49 and idx >= 2:  # Bada Gaon
                nitrate_val = 58.0 if idx == 3 else 52.0
            elif num == 22 and idx >= 2:  # Kampoo Kalan
                fluoride_val = 1.85
            elif num == 58 and idx == 1:  # Padav past surge, now resolved
                tur_val = 8.40
            elif num == 58 and idx >= 2:
                tur_val = 0.45

            reading_item = {
                'sourceId': source_id,
                'readingKey': r_key,
                'readingId': r_id,
                'collectedAt': col_time,
                'receivedAt': rec_time,
                'method': meth,
                'verificationStatus': ver,
                'parameters': {
                    'pH': {'value': ph_val, 'unit': 'pH'},
                    'Turbidity': {'value': tur_val, 'unit': 'NTU'},
                    'TDS': {'value': tds_val, 'unit': 'mg/L'},
                    'Chlorine': {'value': cl_val, 'unit': 'mg/L'},
                    'Fluoride': {'value': fluoride_val, 'unit': 'mg/L'},
                    'Nitrate': {'value': nitrate_val, 'unit': 'mg/L'},
                    'Hardness': {'value': hardness_val, 'unit': 'mg/L'},
                    'Bacteria': {'value': bacteria_val, 'unit': 'qualitative'},
                },
                'isDemo': True,
            }
            water_readings.append(reading_item)
            ward_readings_map[num].append(reading_item)

    # 12 Realistic Municipal Alerts for Gwalior
    alert_defs = [
        {
            'alertId': 'ALT-GWL-2026-001',
            'wardNum': 14,
            'severity': 'CRITICAL',
            'state': 'OPEN',
            'reason': 'Coliform bacterial contamination and elevated TDS (790 mg/L) detected following pipeline excavation near Historic Market Complex.',
            'publicMessage': 'Immediate Boil-Water Advisory: Water screening indicates biological anomaly at Maharaj Bada Central Plaza sector. GMC teams actively sanitizing pipeline.',
            'issuedAt': '2026-11-04T07:15:00Z',
            'readingIndex': 3,
        },
        {
            'alertId': 'ALT-GWL-2026-002',
            'wardNum': 28,
            'severity': 'HIGH',
            'state': 'INVESTIGATION',
            'reason': 'Residual chlorine depleted to 0.05 mg/L (standard threshold >= 0.20 mg/L); risk of secondary contamination in terminal line.',
            'publicMessage': 'High Advisory: Precautionary boil-water recommendation during chlorinator repair and system flush at Sikandar Kampoo.',
            'issuedAt': '2026-11-03T16:45:00Z',
            'readingIndex': 2,
        },
        {
            'alertId': 'ALT-GWL-2026-003',
            'wardNum': 7,
            'severity': 'WARNING',
            'state': 'MONITORING',
            'reason': 'Turbidity spike to 5.80 NTU (threshold 4.00 NTU) due to sediment agitation following Tigra conduit valve realignment.',
            'publicMessage': 'Water Quality Warning: Moderate turbidity observed at Laxmi Ganj / Gol Pahariya feeder; filtration booster running at max capacity.',
            'issuedAt': '2026-11-03T11:20:00Z',
            'readingIndex': 2,
        },
        {
            'alertId': 'ALT-GWL-2026-004',
            'wardNum': 1,
            'severity': 'WARNING',
            'state': 'INVESTIGATION',
            'reason': 'Elevated pH (8.90) detected near Tansen Nagar industrial crossing; potential alkaline industrial runoff ingress.',
            'publicMessage': 'Water Advisory: Tubewell screening anomaly under investigation; industrial effluent isolation active.',
            'issuedAt': '2026-11-04T09:10:00Z',
            'readingIndex': 3,
        },
        {
            'alertId': 'ALT-GWL-2026-005',
            'wardNum': 49,
            'severity': 'HIGH',
            'state': 'PENDING_LAB',
            'reason': 'Nitrate concentration reaching 58.0 mg/L (permissible limit 45.0 mg/L) following heavy agricultural runoff in peri-urban sector.',
            'publicMessage': 'Nitrate Advisory: Vulnerable populations advised to use alternate bottled supply until laboratory verification completes.',
            'issuedAt': '2026-11-02T09:30:00Z',
            'readingIndex': 2,
        },
        {
            'alertId': 'ALT-GWL-2026-006',
            'wardNum': 22,
            'severity': 'WARNING',
            'state': 'OPEN',
            'reason': 'Fluoride reading at 1.85 mg/L (desirable limit 1.0 mg/L, max 1.5 mg/L) observed at deep borewell source.',
            'publicMessage': 'Notice: Geological mineral variance detected; GMC defluoridation unit engaged.',
            'issuedAt': '2026-11-04T06:00:00Z',
            'readingIndex': 3,
        },
        {
            'alertId': 'ALT-GWL-2026-007',
            'wardNum': 52,
            'severity': 'HIGH',
            'state': 'OPEN',
            'reason': 'Pressure drop to 0.4 bar causing high back-siphonage risk in Air Force Road feeder zone.',
            'publicMessage': 'Supply Advisory: Intermittent pressure fluctuation in Pinto Park; distribution valves throttled for pressure stabilization.',
            'issuedAt': '2026-11-04T08:30:00Z',
            'readingIndex': 3,
        },
        {
            'alertId': 'ALT-GWL-2026-008',
            'wardNum': 37,
            'severity': 'WARNING',
            'state': 'MONITORING',
            'reason': 'Free residual chlorine variance between 0.12 mg/L and 0.18 mg/L during peak morning draw.',
            'publicMessage': 'Advisory: Secondary booster dosing station activated at Thatipur West.',
            'issuedAt': '2026-11-03T07:45:00Z',
            'readingIndex': 2,
        },
        {
            'alertId': 'ALT-GWL-2026-009',
            'wardNum': 58,
            'severity': 'CRITICAL',
            'state': 'RESOLVED',
            'reason': 'Post-pipe replacement sediment flush generated 8.4 NTU turbidity; successfully cleared after systematic blow-off.',
            'publicMessage': 'Resolved: Water clarity restored to 0.45 NTU. Padav water distribution fully normalized.',
            'issuedAt': '2026-11-01T15:00:00Z',
            'readingIndex': 1,
        },
        {
            'alertId': 'ALT-GWL-2026-010',
            'wardNum': 10,
            'severity': 'INFO',
            'state': 'CLOSED',
            'reason': 'Scheduled quarterly conduit sterilization and sand filter backwash successfully completed.',
            'publicMessage': 'Informational: Routine maintenance window concluded with all parameters within optimal thresholds.',
            'issuedAt': '2026-11-01T10:00:00Z',
            'readingIndex': 0,
        },
        {
            'alertId': 'ALT-GWL-2026-011',
            'wardNum': 43,
            'severity': 'WARNING',
            'state': 'MONITORING',
            'reason': 'Marginal chlorine level (0.18 mg/L) detected in terminal pipeline segment near Morar Bazaar.',
            'publicMessage': 'Notice: Dosing rate boosted at Gandhi Nagar pumping station; terminal levels recovering.',
            'issuedAt': '2026-11-04T09:00:00Z',
            'readingIndex': 3,
        },
        {
            'alertId': 'ALT-GWL-2026-012',
            'wardNum': 31,
            'severity': 'INFO',
            'state': 'CLOSED',
            'reason': 'Quarterly municipal audit sampling confirmed 100% compliance across all 18 tested physical/chemical parameters.',
            'publicMessage': 'Audit Passed: City Center water supply meets all BIS 10500:2012 specifications.',
            'issuedAt': '2026-11-02T12:00:00Z',
            'readingIndex': 1,
        },
    ]

    for ad in alert_defs:
        source_id = f"gmc-ward-{ad['wardNum']:02d}"
        trigger_reading = ward_readings_map[ad['wardNum']][ad['readingIndex']]
        alert_item = {
            'alertId': ad['alertId'],
            'sourceId': source_id,
            'severity': ad['severity'],
            'state': ad['state'],
            'reason': ad['reason'],
            'publicMessage': ad['publicMessage'],
            'issuedAt': ad['issuedAt'],
            'triggeringReadingKey': trigger_reading['readingKey'],
            'isDemo': True,
        }
        alerts.append(alert_item)

    # 35 Realistic Response Actions for Municipal Teams
    action_templates = [
        # ALT-GWL-2026-001 (Maharaj Bada - Critical)
        ('ALT-GWL-2026-001', 'RA-GWL-0101', '2026-11-04T07:25:00Z', 'SUPERVISOR', 'SITE_INVESTIGATION', 'Dispatched Zonal Water Quality Rapid Response Unit to Maharaj Bada Central Plaza.'),
        ('ALT-GWL-2026-001', 'RA-GWL-0102', '2026-11-04T07:45:00Z', 'OPERATOR', 'ISOLATE_SECTION', 'Isolated 200m commercial feeder pipeline between Sarafa Bazar and Plaza fountain.'),
        ('ALT-GWL-2026-001', 'RA-GWL-0103', '2026-11-04T08:00:00Z', 'REVIEWER', 'PUBLIC_NOTICE', 'Published emergency boil-water bulletin on citizen portal and broadcast via GMC SMS gateway.'),
        ('ALT-GWL-2026-001', 'RA-GWL-0104', '2026-11-04T08:30:00Z', 'OPERATOR', 'FLUSH_PIPELINE', 'Commenced hyper-chlorinated scour flush (5.0 ppm NaOCl) through scour hydrants #12 and #14.'),
        ('ALT-GWL-2026-001', 'RA-GWL-0105', '2026-11-04T09:15:00Z', 'LAB_CHEMIST', 'COLLECT_LAB_SAMPLE', 'Collected 6 sterile duplicate samples for certified 24-hr membrane filtration culture test.'),

        # ALT-GWL-2026-002 (Sikandar Kampoo - High)
        ('ALT-GWL-2026-002', 'RA-GWL-0201', '2026-11-03T17:00:00Z', 'OPERATOR', 'SITE_INVESTIGATION', 'Inspected automated dosing pump at Gudha chlorination substation; identified peristaltic tube rupture.'),
        ('ALT-GWL-2026-002', 'RA-GWL-0202', '2026-11-03T17:40:00Z', 'OPERATOR', 'REMEDIATION', 'Replaced metering diaphragm and replenished sodium hypochlorite solution in primary tank.'),
        ('ALT-GWL-2026-003', 'RA-GWL-0203', '2026-11-03T18:30:00Z', 'OPERATOR', 'CHLORINATION_ADJUSTMENT', 'Injected shock dose to re-establish 0.60 mg/L chlorine residual across downstream distribution.'),
        ('ALT-GWL-2026-004', 'RA-GWL-0204', '2026-11-04T06:30:00Z', 'SAMPLING_OPERATOR', 'RESAMPLE_AND_TEST', 'Morning resample verified chlorine recovered to 0.45 mg/L; advisory downgraded to monitoring.'),

        # ALT-GWL-2026-003 (Gol Pahariya - Warning)
        ('ALT-GWL-2026-003', 'RA-GWL-0301', '2026-11-03T11:45:00Z', 'REVIEWER', 'SITE_INVESTIGATION', 'Checked pressure sensor telemetry at Laxmi Ganj bypass; confirmed upstream valve throttling induced backwash.'),
        ('ALT-GWL-2026-003', 'RA-GWL-0302', '2026-11-03T12:30:00Z', 'OPERATOR', 'FLUSH_PIPELINE', 'Opened terminal blow-off valve on Kampoo link for 45 minutes until clarity improved.'),
        ('ALT-GWL-2026-003', 'RA-GWL-0303', '2026-11-03T14:00:00Z', 'SAMPLING_OPERATOR', 'RESAMPLE_AND_TEST', 'Turbidity measured down to 2.1 NTU; continued monitoring through evening delivery cycle.'),

        # ALT-GWL-2026-004 (Hazira Industrial - Warning)
        ('ALT-GWL-2026-004', 'RA-GWL-0401', '2026-11-04T09:30:00Z', 'SUPERVISOR', 'SITE_INVESTIGATION', 'Joint inspection with MP Pollution Control Board at Tansen Nagar industrial drain embankment.'),
        ('ALT-GWL-2026-004', 'RA-GWL-0402', '2026-11-04T10:00:00Z', 'OPERATOR', 'ISOLATE_SECTION', 'Temporarily diverted GMC Tubewell #01 to non-potable bypass line during chemical profiling.'),
        ('ALT-GWL-2026-004', 'RA-GWL-0403', '2026-11-04T10:20:00Z', 'LAB_CHEMIST', 'COLLECT_LAB_SAMPLE', 'Acquired grab samples for heavy metals, alkalinity, and volatile organic compound screening.'),

        # ALT-GWL-2026-005 (Bada Gaon - High Nitrate)
        ('ALT-GWL-2026-005', 'RA-GWL-0501', '2026-11-02T10:00:00Z', 'REVIEWER', 'SITE_INVESTIGATION', 'Surveillance of surrounding agricultural parcel irrigation channels and fertilizer runoffs.'),
        ('ALT-GWL-2026-005', 'RA-GWL-0502', '2026-11-02T11:00:00Z', 'OPERATOR', 'PUBLIC_NOTICE', 'Distributed warning flyers to local community center advising pregnant women and infants on bottled water.'),
        ('ALT-GWL-2026-005', 'RA-GWL-0503', '2026-11-02T13:30:00Z', 'LAB_CHEMIST', 'COLLECT_LAB_SAMPLE', 'Sent split samples to Central Public Health Engineering Laboratory in Bhopal for spectrophotometric verification.'),

        # ALT-GWL-2026-006 (Kampoo Kalan - Fluoride)
        ('ALT-GWL-2026-006', 'RA-GWL-0601', '2026-11-04T06:30:00Z', 'OPERATOR', 'SITE_INVESTIGATION', 'Inspected activated alumina filter bed at Kampoo Kalan community water treatment plant.'),
        ('ALT-GWL-2026-006', 'RA-GWL-0602', '2026-11-04T07:15:00Z', 'OPERATOR', 'REMEDIATION', 'Scheduled media regeneration with dilute caustic soda and acid neutralization wash.'),

        # ALT-GWL-2026-007 (Pinto Park - Pressure Drop)
        ('ALT-GWL-2026-007', 'RA-GWL-0701', '2026-11-04T08:50:00Z', 'SUPERVISOR', 'SITE_INVESTIGATION', 'Detected leaking air-release valve on Air Force Road 300mm cast-iron supply conduit.'),
        ('ALT-GWL-2026-007', 'RA-GWL-0702', '2026-11-04T09:30:00Z', 'OPERATOR', 'REMEDIATION', 'Excavation team mobilized; emergency repair clamp installed; line pressure restored to 1.8 bar.'),

        # ALT-GWL-2026-008 (Thatipur West - Chlorine Variance)
        ('ALT-GWL-2026-008', 'RA-GWL-0801', '2026-11-03T08:15:00Z', 'OPERATOR', 'CHLORINATION_ADJUSTMENT', 'Adjusted feed rate on gas chlorinator at Gandhi Nagar Water Works from 1.2 kg/hr to 1.5 kg/hr.'),
        ('ALT-GWL-2026-008', 'RA-GWL-0802', '2026-11-03T09:30:00Z', 'SAMPLING_OPERATOR', 'RESAMPLE_AND_TEST', 'Checked Thatipur West terminal sample tap; chlorine level verified at 0.38 mg/L.'),

        # ALT-GWL-2026-009 (Padav - Turbidity Resolved)
        ('ALT-GWL-2026-009', 'RA-GWL-0901', '2026-11-01T15:20:00Z', 'OPERATOR', 'SITE_INVESTIGATION', 'Responded to citizen reports of brown discolored water near Railway Station Overpass.'),
        ('ALT-GWL-2026-009', 'RA-GWL-0902', '2026-11-01T16:00:00Z', 'OPERATOR', 'FLUSH_PIPELINE', 'Systematic unidirectional flushing across Padav commercial grid for 2.5 hours.'),
        ('ALT-GWL-2026-009', 'RA-GWL-0903', '2026-11-01T19:00:00Z', 'LAB_CHEMIST', 'RESAMPLE_AND_TEST', 'Turbidity measured at 0.45 NTU, TDS 240 mg/L; line certified clean.'),
        ('ALT-GWL-2026-009', 'RA-GWL-0904', '2026-11-01T19:30:00Z', 'REVIEWER', 'RESOLVE_ALERT', 'Executive Engineer signed off; alert closed and public notice removed.'),

        # ALT-GWL-2026-010 (Jiwaji Ganj - Closed Maintenance)
        ('ALT-GWL-2026-010', 'RA-GWL-1001', '2026-11-01T10:15:00Z', 'OPERATOR', 'SITE_INVESTIGATION', 'Conducted pre-maintenance flow measurement at Jiwaji Ganj radial well pump.'),
        ('ALT-GWL-2026-010', 'RA-GWL-1002', '2026-11-01T12:00:00Z', 'OPERATOR', 'REMEDIATION', 'Filter media backwash completed with zero silt carryover.'),
        ('ALT-GWL-2026-010', 'RA-GWL-1003', '2026-11-01T13:00:00Z', 'SUPERVISOR', 'RESOLVE_ALERT', 'Routine quarterly certificate logged into GMC water compliance database.'),

        # ALT-GWL-2026-011 (Morar Cantt - Monitoring)
        ('ALT-GWL-2026-011', 'RA-GWL-1101', '2026-11-04T09:20:00Z', 'OPERATOR', 'SITE_INVESTIGATION', 'Measured residual chlorine at 5 public standposts along Morar Bazaar.'),
        ('ALT-GWL-2026-011', 'RA-GWL-1102', '2026-11-04T09:45:00Z', 'OPERATOR', 'CHLORINATION_ADJUSTMENT', 'Raised booster chlorinator dosage at Morar Cantt overhead tank.'),

        # ALT-GWL-2026-012 (City Center - Audit Passed)
        ('ALT-GWL-2026-012', 'RA-GWL-1201', '2026-11-02T12:15:00Z', 'LAB_CHEMIST', 'COLLECT_LAB_SAMPLE', 'Sampled 12 nodal points across Sachin Tendulkar Marg and Patel Nagar.'),
        ('ALT-GWL-2026-012', 'RA-GWL-1202', '2026-11-02T16:00:00Z', 'SUPERVISOR', 'RESOLVE_ALERT', 'All 18 microbiological and physico-chemical indices compliant with BIS standards.'),
    ]

    for alert_id, action_id, created_at, role, a_type, summary in action_templates:
        action_key = f"{created_at}#{action_id}"
        action_item = {
            'alertId': alert_id,
            'actionKey': action_key,
            'actionId': action_id,
            'actorRole': role,
            'actionType': a_type,
            'summary': summary,
            'createdAt': created_at,
            'isDemo': True,
        }
        response_actions.append(action_item)

    dataset = {
        'notice': 'Realistic municipal water surveillance dataset for Gwalior Municipal Corporation (66 Wards).',
        'WaterSources': water_sources,
        'WaterReadings': water_readings,
        'Alerts': alerts,
        'ResponseActions': response_actions,
    }

    # Save to disk
    OUTPUT_DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_DATA_PATH.open('w', encoding='utf-8') as f:
        json.dump(dataset, f, indent=2)

    print(f"Dataset generated at {OUTPUT_DATA_PATH}:")
    print(f" - WaterSources: {len(water_sources)}")
    print(f" - WaterReadings: {len(water_readings)}")
    print(f" - Alerts: {len(alerts)}")
    print(f" - ResponseActions: {len(response_actions)}")
    return dataset


def seed_tables(dataset: dict, apply: bool = False, profile: str | None = None):
    load_local_env()
    required = ['AWS_REGION', *TABLE_SETTINGS.values()]
    missing = [key for key in required if not os.environ.get(key)]
    if missing:
        raise RuntimeError(f"Set these values in backend/.env: {', '.join(missing)}")

    options = {'region_name': os.environ['AWS_REGION']}
    options.update(resolve_credentials(profile))

    # Convert floats to Decimals for boto3 DynamoDB compatibility
    db = boto3.resource('dynamodb', **options)

    total_inserted = 0
    total_skipped = 0

    for table_key, env_var in TABLE_SETTINGS.items():
        table_name = os.environ[env_var]
        table = db.Table(table_name)
        keys = table.key_schema
        hash_key = next(k['AttributeName'] for k in keys if k['KeyType'] == 'HASH')
        range_keys = [k['AttributeName'] for k in keys if k['KeyType'] == 'RANGE']

        items = dataset[table_key]
        print(f"\nProcessing {table_key} ({table_name}): {len(items)} items")

        # Convert items to Decimal for DynamoDB
        clean_items = json.loads(json.dumps(items), parse_float=Decimal)

        t_inserted = 0
        t_skipped = 0

        # We can use batch_writer or put_item with condition
        # Using put_item with condition to prevent overwriting existing custom items
        for item in clean_items:
            condition = Attr(hash_key).not_exists()
            for rk in range_keys:
                condition = condition & Attr(rk).not_exists()

            if not apply:
                continue

            try:
                table.put_item(Item=item, ConditionExpression=condition)
                t_inserted += 1
            except ClientError as exc:
                if exc.response.get('Error', {}).get('Code') == 'ConditionalCheckFailedException':
                    t_skipped += 1
                else:
                    print(f"Error putting item {item.get(hash_key)}: {exc}")
                    raise

        if apply:
            print(f" -> {table_key}: Inserted {t_inserted}, skipped existing {t_skipped}")
            total_inserted += t_inserted
            total_skipped += t_skipped
        else:
            print(f" -> {table_key}: Dry run only ({len(items)} items ready to write)")

    if apply:
        print(f"\nSeeding complete: Total Inserted: {total_inserted}, Total Skipped: {total_skipped}")
    else:
        print("\nDry run complete. Run with --apply to write to DynamoDB.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true', help='write dataset to DynamoDB')
    parser.add_argument('--profile', default=os.environ.get('AWS_PROFILE', 'aquaalert'), help='AWS profile')
    args = parser.parse_args()

    dataset = generate_dataset()
    seed_tables(dataset, apply=args.apply, profile=args.profile)


if __name__ == '__main__':
    main()
