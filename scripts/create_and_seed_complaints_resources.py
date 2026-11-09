#!/usr/bin/env python3
"""
Create and seed dedicated DynamoDB table and S3 bucket for Citizen Complaints:
  - DynamoDB Table: 'Complaints' (Partition key: complaintId [S])
  - S3 Bucket: 'waterq-dev-complaints-evidence' (Configured with CORS for direct browser PUT uploads)
  - Seeds realistic municipal complaints across Gwalior administrative wards.
"""
from __future__ import annotations

import json
import os
import sys
import time
from decimal import Decimal
from pathlib import Path

import boto3
from botocore.exceptions import ClientError

REGION = os.environ.get('AWS_REGION', 'ap-south-1')
PROFILE = os.environ.get('AWS_PROFILE', 'aquaalert')

TABLE_NAME = os.environ.get('COMPLAINTS_TABLE', 'Complaints')
BUCKET_NAME = os.environ.get('COMPLAINTS_BUCKET', 'waterq-dev-complaints-evidence')

SEED_COMPLAINTS = [
    {
        "complaintId": "AA-CMP-2026-W14-01",
        "reference": "AA-CMP-2026-W14-01",
        "wardNumber": 14,
        "sourceId": "gmc-ward-14",
        "sourceName": "Maharaj Bada Central Hand Pump #04",
        "category": "Turbid / Muddy water",
        "details": "Severe brownish turbidity observed in tap water line near Sarafa Bazaar commercial feeder. Suspended silt particles noticed.",
        "citizenName": "Ramesh Chandra Sharma",
        "citizenPhone": "+91 98261 45890",
        "citizenEmail": "ramesh.sharma@example.com",
        "status": "IN_PROGRESS",
        "priority": "HIGH",
        "assignedTo": "Er. R. K. Sharma (Lashkar Central Lead)",
        "resolutionNotes": "Field technician dispatched for pipeline scouring and valve inspection at Sarafa connector.",
        "s3Bucket": BUCKET_NAME,
        "s3Key": "complaints/evidence/AA-CMP-2026-W14-01_turbid_tap.jpg",
        "photoName": "turbid_tap_sample.jpg",
        "createdAt": "2026-11-04T09:15:00Z",
        "updatedAt": "2026-11-04T11:30:00Z"
    },
    {
        "complaintId": "AA-CMP-2026-W28-02",
        "reference": "AA-CMP-2026-W28-02",
        "wardNumber": 28,
        "sourceId": "gmc-ward-28",
        "sourceName": "Sikandar Kampoo Feeder Main",
        "category": "Chemical odor / Chlorine depletion",
        "details": "Strong pungent chemical odor after morning valve repair. Bleaching powder residue and chlorine imbalance suspected.",
        "citizenName": "Sunita Verma",
        "citizenPhone": "+91 94251 77210",
        "citizenEmail": "sunita.v@example.com",
        "status": "ASSIGNED",
        "priority": "CRITICAL",
        "assignedTo": "P. K. Verma (Zone 10 Water Works)",
        "resolutionNotes": "Dosing unit recalibration ordered at Lashkar booster station.",
        "s3Bucket": BUCKET_NAME,
        "s3Key": "complaints/evidence/AA-CMP-2026-W28-02_chem_color.jpg",
        "photoName": "chemical_test_reading.jpg",
        "createdAt": "2026-11-05T14:20:00Z",
        "updatedAt": "2026-11-05T15:00:00Z"
    },
    {
        "complaintId": "AA-CMP-2026-W02-03",
        "reference": "AA-CMP-2026-W02-03",
        "wardNumber": 2,
        "sourceId": "gmc-ward-02",
        "sourceName": "Fort Foothills / Kila Gate Sub-main",
        "category": "Low pressure / No supply",
        "details": "Water pressure dropped below 0.3 bar in Kila Gate sector. Upper elevation households received no supply during morning hours.",
        "citizenName": "Dinesh Tomar",
        "citizenPhone": "+91 97531 22894",
        "citizenEmail": "dinesh.tomar@example.com",
        "status": "PENDING",
        "priority": "HIGH",
        "assignedTo": "Unassigned",
        "s3Bucket": BUCKET_NAME,
        "createdAt": "2026-11-06T07:45:00Z",
        "updatedAt": "2026-11-06T07:45:00Z"
    },
    {
        "complaintId": "AA-CMP-2026-W07-04",
        "reference": "AA-CMP-2026-W07-04",
        "wardNumber": 7,
        "sourceId": "gmc-ward-07",
        "sourceName": "Laxmi Ganj Feeder",
        "category": "Water quality concern",
        "details": "Reddish iron flakes and rust particles clogging mesh aerators in domestic taps.",
        "citizenName": "Pooja Kushwah",
        "citizenPhone": "+91 91118 63401",
        "status": "RESOLVED",
        "priority": "MEDIUM",
        "assignedTo": "Er. S. N. Mishra (Zone 03 Engineer)",
        "resolutionNotes": "Replaced corroded galvanized nipple on secondary line and back-flushed submain. Water quality verified clear.",
        "resolvedAt": "2026-11-03T16:40:00Z",
        "s3Bucket": BUCKET_NAME,
        "createdAt": "2026-11-02T10:10:00Z",
        "updatedAt": "2026-11-03T16:40:00Z"
    },
    {
        "complaintId": "AA-CMP-2026-W58-05",
        "reference": "AA-CMP-2026-W58-05",
        "wardNumber": 58,
        "sourceId": "gmc-ward-58",
        "sourceName": "Padav Junction Distribution Line",
        "category": "Pipeline burst / Leakage",
        "details": "Major underground pipeline fracture near railway station overbridge. Drinking water flooding road surface and risking sewage back-siphonage.",
        "citizenName": "Anand Soni",
        "citizenPhone": "+91 98930 11477",
        "status": "IN_PROGRESS",
        "priority": "CRITICAL",
        "assignedTo": "Emergency Pipeline Rapid Response Unit #2",
        "resolutionNotes": "Isolation sluice valve shut. Heavy excavation team on site with pipe sleeve clamp.",
        "s3Bucket": BUCKET_NAME,
        "s3Key": "complaints/evidence/AA-CMP-2026-W58-05_leak.jpg",
        "photoName": "pipeline_burst_leakage.jpg",
        "createdAt": "2026-11-06T18:00:00Z",
        "updatedAt": "2026-11-06T19:30:00Z"
    },
    {
        "complaintId": "AA-CMP-2026-W01-06",
        "reference": "AA-CMP-2026-W01-06",
        "wardNumber": 1,
        "sourceId": "gmc-ward-01",
        "sourceName": "Hazira Industrial Area Deep Borewell",
        "category": "Saline / High TDS taste",
        "details": "Community borewell sample has strong brackish taste. Laboratory titration revealed TDS level above 500 mg/L limit.",
        "citizenName": "Kailash Chand",
        "citizenPhone": "+91 94253 88120",
        "status": "IN_PROGRESS",
        "priority": "MEDIUM",
        "assignedTo": "Dr. S. Mukherjee (PHED Chemist)",
        "resolutionNotes": "Secondary RO blending line activated to dilute mineralization.",
        "s3Bucket": BUCKET_NAME,
        "createdAt": "2026-11-05T09:00:00Z",
        "updatedAt": "2026-11-05T14:15:00Z"
    },
    {
        "complaintId": "AA-CMP-2026-W31-07",
        "reference": "AA-CMP-2026-W31-07",
        "wardNumber": 31,
        "sourceId": "gmc-ward-31",
        "sourceName": "City Center / Patel Nagar Distribution Sub-main",
        "category": "Pipeline burst / Leakage",
        "details": "Underground pipe joint leak causing standing water pool on Patel Nagar commercial road.",
        "citizenName": "Vikramaditya Rao",
        "citizenPhone": "+91 98270 44321",
        "status": "RESOLVED",
        "priority": "HIGH",
        "assignedTo": "Ward 31 Maintenance Squad",
        "resolutionNotes": "Excavated line and fitted 150mm mechanical clamp. Supply pressure restored to 1.8 bar.",
        "resolvedAt": "2026-11-04T18:30:00Z",
        "s3Bucket": BUCKET_NAME,
        "createdAt": "2026-11-03T12:00:00Z",
        "updatedAt": "2026-11-04T18:30:00Z"
    },
    {
        "complaintId": "AA-CMP-2026-W43-08",
        "reference": "AA-CMP-2026-W43-08",
        "wardNumber": 43,
        "sourceId": "gmc-ward-43",
        "sourceName": "Morar Cantt Feeder Main",
        "category": "Sewage cross-contamination concern",
        "details": "Blackish discolored water emitting foul sewer odor during first 10 minutes of morning municipal supply cycle.",
        "citizenName": "Mrs. Shashi Saxena",
        "citizenPhone": "+91 93011 55299",
        "status": "PENDING",
        "priority": "CRITICAL",
        "assignedTo": "Unassigned",
        "s3Bucket": BUCKET_NAME,
        "createdAt": "2026-11-07T06:30:00Z",
        "updatedAt": "2026-11-07T06:30:00Z"
    }
]

def get_session():
    try:
        session = boto3.Session(profile_name=PROFILE, region_name=REGION)
        session.client('sts').get_caller_identity()
        return session
    except Exception:
        return boto3.Session(region_name=REGION)

def ensure_s3_bucket(session):
    s3_client = session.client('s3', region_name=REGION)
    print(f"Checking S3 bucket '{BUCKET_NAME}' in {REGION}...")
    try:
        s3_client.head_bucket(Bucket=BUCKET_NAME)
        print(f"Bucket '{BUCKET_NAME}' already exists.")
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code')
        if error_code in ['404', 'NoSuchBucket']:
            print(f"Creating S3 bucket '{BUCKET_NAME}'...")
            kwargs = {'Bucket': BUCKET_NAME}
            if REGION != 'us-east-1':
                kwargs['CreateBucketConfiguration'] = {'LocationConstraint': REGION}
            s3_client.create_bucket(**kwargs)
            print(f"Bucket '{BUCKET_NAME}' created successfully.")
        else:
            print(f"Notice inspecting bucket '{BUCKET_NAME}': {e}")

    # Configure CORS for browser PUT uploads
    cors_config = {
        'CORSRules': [
            {
                'AllowedHeaders': ['*'],
                'AllowedMethods': ['GET', 'PUT', 'POST', 'HEAD'],
                'AllowedOrigins': ['*'],
                'ExposeHeaders': ['ETag', 'x-amz-server-side-encryption'],
                'MaxAgeSeconds': 3600
            }
        ]
    }
    try:
        s3_client.put_bucket_cors(Bucket=BUCKET_NAME, CORSConfiguration=cors_config)
        print(f"CORS rules configured on '{BUCKET_NAME}'.")
    except Exception as e:
        print(f"Notice setting CORS on bucket: {e}")

def ensure_dynamodb_table(session):
    ddb_client = session.client('dynamodb', region_name=REGION)
    print(f"Checking DynamoDB table '{TABLE_NAME}' in {REGION}...")
    try:
        ddb_client.describe_table(TableName=TABLE_NAME)
        print(f"Table '{TABLE_NAME}' already exists.")
    except ClientError as e:
        if e.response.get('Error', {}).get('Code') == 'ResourceNotFoundException':
            print(f"Creating DynamoDB table '{TABLE_NAME}'...")
            ddb_client.create_table(
                TableName=TABLE_NAME,
                KeySchema=[
                    {'AttributeName': 'complaintId', 'KeyType': 'HASH'}
                ],
                AttributeDefinitions=[
                    {'AttributeName': 'complaintId', 'AttributeType': 'S'}
                ],
                BillingMode='PAY_PER_REQUEST'
            )
            print(f"Waiting for table '{TABLE_NAME}' to become active...")
            waiter = ddb_client.get_waiter('table_exists')
            waiter.wait(TableName=TABLE_NAME)
            print(f"Table '{TABLE_NAME}' is now ACTIVE.")
        else:
            raise

def seed_complaints(session):
    ddb = session.resource('dynamodb', region_name=REGION)
    table = ddb.Table(TABLE_NAME)
    print(f"Seeding {len(SEED_COMPLAINTS)} citizen complaints into '{TABLE_NAME}'...")
    count = 0
    for item in SEED_COMPLAINTS:
        try:
            table.put_item(Item=item)
            count += 1
            print(f"  + Seeded {item['complaintId']} (Ward {item['wardNumber']} - {item['category']})")
        except Exception as e:
            print(f"  x Failed to put {item['complaintId']}: {e}")
    print(f"Successfully seeded {count} complaint records into '{TABLE_NAME}'.")

def main():
    print("=" * 70)
    print("AquaAlert: Citizen Complaints AWS Infrastructure Provisioning")
    print(f"Region: {REGION} | Table: {TABLE_NAME} | Bucket: {BUCKET_NAME}")
    print("=" * 70)
    session = get_session()
    try:
        ensure_s3_bucket(session)
    except Exception as e:
        print(f"S3 setup notice: {e}")
    try:
        ensure_dynamodb_table(session)
        seed_complaints(session)
    except Exception as e:
        print(f"DynamoDB setup notice: {e}")
    print("=" * 70)
    print("Provisioning process complete.")

if __name__ == '__main__':
    main()
