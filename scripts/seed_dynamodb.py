#!/usr/bin/env python3
"""Import the former Admin mock rows as synthetic demo items; dry-run by default."""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
from decimal import Decimal
from pathlib import Path

import boto3
from boto3.dynamodb.conditions import Attr
from botocore.exceptions import ClientError

ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = ROOT / 'backend' / '.env'
DATA_PATH = ROOT / 'backend' / 'seed' / 'admin_demo_records.json'
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


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true', help='write missing demo rows')
    parser.add_argument('--profile', default=os.environ.get('AWS_PROFILE', 'aquaalert'), help='AWS profile name')
    args = parser.parse_args()
    load_local_env()
    required = ['AWS_REGION', *TABLE_SETTINGS.values()]
    missing = [key for key in required if not os.environ.get(key)]
    if missing:
        parser.error(f"set these values in backend/.env: {', '.join(missing)}")

    options = {'region_name': os.environ['AWS_REGION']}
    options.update(resolve_credentials(args.profile))

    with DATA_PATH.open(encoding='utf-8') as stream:
        datasets = json.load(stream, parse_float=Decimal)
    db = boto3.resource('dynamodb', **options)
    inserted = skipped = 0
    for dataset, env_name in TABLE_SETTINGS.items():
        table = db.Table(os.environ[env_name])
        keys = table.key_schema
        hash_key = next(key['AttributeName'] for key in keys if key['KeyType'] == 'HASH')
        range_keys = [key['AttributeName'] for key in keys if key['KeyType'] == 'RANGE']
        for raw in datasets[dataset]:
            item = raw
            required_keys = [hash_key, *range_keys]
            if any(key not in item for key in required_keys):
                raise ValueError(f'{dataset} item lacks DynamoDB key(s): {required_keys}')
            condition = Attr(hash_key).not_exists()
            for key in range_keys:
                condition = condition & Attr(key).not_exists()
            print(f"{'WRITE' if args.apply else 'DRY RUN'} {dataset}: {item[hash_key]}")
            if not args.apply:
                continue
            try:
                table.put_item(Item=item, ConditionExpression=condition)
                inserted += 1
            except ClientError as exc:
                if exc.response.get('Error', {}).get('Code') == 'ConditionalCheckFailedException':
                    skipped += 1
                else:
                    raise
    print(f"{'Inserted ' + str(inserted) + ', skipped existing ' + str(skipped) if args.apply else 'Dry run only; add --apply to write.'}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
