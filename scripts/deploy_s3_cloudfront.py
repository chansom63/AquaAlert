#!/usr/bin/env python3
"""
Deploy AquaAlert frontend to Amazon S3 and Amazon CloudFront.

1. Authenticates using profile 'aquaalert' in ap-south-1.
2. Builds the Vite production bundle into dist/.
3. Uploads dist/ to S3 bucket 'waterq-dev-frontend' with exact MIME types and caching headers:
   - assets/*.js & assets/*.css: public, max-age=31536000, immutable
   - index.html: no-cache, no-store, must-revalidate
4. Sets up CloudFront Origin Access Control (OAC) and creates/locates the distribution:
   - S3 Origin with OAC SigV4 authentication.
   - SPA Client-Side Routing: 403 & 404 fallbacks -> /index.html with HTTP 200.
   - Viewer Protocol Policy: Redirect HTTP to HTTPS.
   - Compression enabled.
5. Updates the S3 Bucket Policy to securely allow CloudFront distribution access.
6. Submits a CloudFront cache invalidation (/*).
7. Outputs the live CloudFront URL.
"""

from __future__ import annotations

import json
import mimetypes
import os
import subprocess
import sys
import time
from pathlib import Path

import boto3
from botocore.exceptions import ClientError

REGION = os.environ.get("AWS_REGION", "ap-south-1")
PROFILE = os.environ.get("AWS_PROFILE", "aquaalert")
BUCKET_NAME = os.environ.get("FRONTEND_BUCKET", "waterq-dev-frontend")
DIST_DIR = Path("dist")

# Ensure critical web mimetypes
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("application/javascript", ".mjs")
mimetypes.add_type("text/css", ".css")
mimetypes.add_type("image/svg+xml", ".svg")
mimetypes.add_type("application/json", ".json")
mimetypes.add_type("text/html", ".html")
mimetypes.add_type("image/png", ".png")
mimetypes.add_type("image/jpeg", ".jpg")
mimetypes.add_type("image/webp", ".webp")


def get_session() -> boto3.Session:
    for prof in [PROFILE, "default", "aquaalert-dev", None]:
        try:
            sess = (
                boto3.Session(profile_name=prof, region_name=REGION)
                if prof
                else boto3.Session(region_name=REGION)
            )
            sts = sess.client("sts")
            ident = sts.get_caller_identity()
            print(f"✓ Authenticated: {ident['Arn']} (Account: {ident['Account']})")
            return sess
        except Exception:
            continue

    raise RuntimeError(
        "Could not authenticate with AWS.\n"
        "Please run 'aws login --profile aquaalert' in your terminal or set AWS credentials."
    )


def build_frontend():
    print("\n📦 Building production bundle (npm run build)...")
    res = subprocess.run(["npm", "run", "build"], capture_output=True, text=True)
    if res.returncode != 0:
        print(res.stderr)
        sys.exit(1)
    print("✓ Frontend build completed into 'dist/'.")


def upload_dist(s3_client, bucket_name: str):
    print(f"\n🚀 Syncing 'dist/' to S3 bucket '{bucket_name}'...")
    uploaded = 0
    total_size = 0

    for path in DIST_DIR.rglob("*"):
        if not path.is_file():
            continue

        s3_key = path.relative_to(DIST_DIR).as_posix()
        ctype, _ = mimetypes.guess_type(path.name)
        ctype = ctype or "application/octet-stream"

        if s3_key == "index.html":
            cache_ctrl = "no-cache, no-store, must-revalidate"
        elif s3_key.startswith("assets/"):
            cache_ctrl = "public, max-age=31536000, immutable"
        else:
            cache_ctrl = "public, max-age=86400"

        extra = {
            "ContentType": ctype,
            "CacheControl": cache_ctrl,
        }

        s3_client.upload_file(
            Filename=str(path),
            Bucket=bucket_name,
            Key=s3_key,
            ExtraArgs=extra,
        )
        sz = path.stat().st_size
        total_size += sz
        uploaded += 1
        print(f"  • {s3_key} ({ctype}) - {sz / 1024:.1f} KB")

    print(f"✓ Uploaded {uploaded} files ({total_size / (1024 * 1024):.2f} MB) to S3.")


def ensure_oac(cf_client) -> str:
    oac_name = f"{BUCKET_NAME}-oac"
    print(f"\n🔐 Checking CloudFront Origin Access Control '{oac_name}'...")

    paginator = cf_client.get_paginator("list_origin_access_controls")
    for page in paginator.paginate():
        for oac in page.get("OriginAccessControlList", {}).get("Items", []):
            if oac["Name"] == oac_name:
                print(f"✓ Found existing OAC: {oac['Id']}")
                return oac["Id"]

    print(f"Creating new Origin Access Control '{oac_name}'...")
    resp = cf_client.create_origin_access_control(
        OriginAccessControlConfig={
            "Name": oac_name,
            "Description": f"OAC for {BUCKET_NAME}",
            "SigningProtocol": "sigv4",
            "SigningBehavior": "always",
            "OriginAccessControlOriginType": "s3",
        }
    )
    oac_id = resp["OriginAccessControl"]["Id"]
    print(f"✓ Created OAC with ID: {oac_id}")
    return oac_id


def ensure_distribution(cf_client, bucket_name: str, oac_id: str) -> dict:
    s3_domain = f"{bucket_name}.s3.{REGION}.amazonaws.com"
    origin_id = f"S3-{bucket_name}"

    print(f"\n🌐 Checking CloudFront distributions for origin '{s3_domain}'...")
    paginator = cf_client.get_paginator("list_distributions")
    for page in paginator.paginate():
        for dist in page.get("DistributionList", {}).get("Items", []):
            for orig in dist.get("Origins", {}).get("Items", []):
                if bucket_name in orig.get("DomainName", ""):
                    print(f"✓ Found existing CloudFront distribution: {dist['Id']} ({dist['DomainName']})")
                    return dist

    print("Creating new CloudFront Distribution for AquaAlert...")
    dist_config = {
        "CallerReference": f"aquaalert-cf-{int(time.time())}",
        "Comment": "AquaAlert Smart Water Quality Surveillance System",
        "DefaultRootObject": "index.html",
        "Origins": {
            "Quantity": 1,
            "Items": [
                {
                    "Id": origin_id,
                    "DomainName": s3_domain,
                    "OriginPath": "",
                    "CustomHeaders": {"Quantity": 0},
                    "S3OriginConfig": {
                        "OriginAccessIdentity": "",
                    },
                    "OriginAccessControlId": oac_id,
                }
            ],
        },
        "DefaultCacheBehavior": {
            "TargetOriginId": origin_id,
            "ViewerProtocolPolicy": "redirect-to-https",
            "AllowedMethods": {
                "Quantity": 3,
                "Items": ["GET", "HEAD", "OPTIONS"],
                "CachedMethods": {
                    "Quantity": 2,
                    "Items": ["GET", "HEAD"],
                },
            },
            "Compress": True,
            # AWS Managed-CachingOptimized policy ID
            "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
        },
        "CustomErrorResponses": {
            "Quantity": 2,
            "Items": [
                {
                    "ErrorCode": 403,
                    "ResponsePagePath": "/index.html",
                    "ResponseCode": "200",
                    "ErrorCachingMinTTL": 0,
                },
                {
                    "ErrorCode": 404,
                    "ResponsePagePath": "/index.html",
                    "ResponseCode": "200",
                    "ErrorCachingMinTTL": 0,
                },
            ],
        },
        "Enabled": True,
        "PriceClass": "PriceClass_All",
    }

    resp = cf_client.create_distribution(DistributionConfig=dist_config)
    dist = resp["Distribution"]
    print(f"✓ Created CloudFront distribution: {dist['Id']} ({dist['DomainName']})")
    return dist


def update_bucket_policy(s3_client, bucket_name: str, account_id: str, dist_id: str):
    print(f"\n🔒 Applying CloudFront OAC Bucket Policy to '{bucket_name}'...")
    policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "AllowCloudFrontServicePrincipalReadOnly",
                "Effect": "Allow",
                "Principal": {
                    "Service": "cloudfront.amazonaws.com"
                },
                "Action": "s3:GetObject",
                "Resource": f"arn:aws:s3:::{bucket_name}/*",
                "Condition": {
                    "StringEquals": {
                        "AWS:SourceArn": f"arn:aws:cloudfront::{account_id}:distribution/{dist_id}"
                    }
                },
            }
        ],
    }
    s3_client.put_bucket_policy(Bucket=bucket_name, Policy=json.dumps(policy))
    print("✓ Bucket policy updated to permit CloudFront OAC read access.")


def invalidate_cache(cf_client, dist_id: str):
    print(f"\n🔄 Submitting CloudFront cache invalidation (/*)...")
    try:
        res = cf_client.create_invalidation(
            DistributionId=dist_id,
            InvalidationBatch={
                "Paths": {"Quantity": 1, "Items": ["/*"]},
                "CallerReference": f"inval-{int(time.time())}",
            },
        )
        inval_id = res.get("Invalidation", {}).get("Id", "")
        print(f"✓ Invalidation submitted: {inval_id}")
    except Exception as e:
        print(f"Notice on cache invalidation: {e}")


def main():
    print("=" * 70)
    print("  🚀 AquaAlert - Deploy to Amazon S3 & CloudFront CDN")
    print("=" * 70)

    session = get_session()
    account_id = session.client("sts").get_caller_identity()["Account"]

    s3 = session.client("s3", region_name=REGION)
    cf = session.client("cloudfront")

    build_frontend()
    upload_dist(s3, BUCKET_NAME)

    oac_id = ensure_oac(cf)
    dist = ensure_distribution(cf, BUCKET_NAME, oac_id)
    dist_id = dist["Id"]
    dist_domain = dist["DomainName"]

    update_bucket_policy(s3, BUCKET_NAME, account_id, dist_id)
    invalidate_cache(cf, dist_id)

    cf_url = f"https://{dist_domain}"
    print("\n" + "=" * 70)
    print("  🎉 DEPLOYMENT SUCCESSFUL!")
    print("=" * 70)
    print(f"  • S3 Bucket:              {BUCKET_NAME} ({REGION})")
    print(f"  • CloudFront Dist ID:     {dist_id}")
    print(f"  • Live CloudFront URL:    {cf_url}")
    print(f"  • SPA Client Routing:     Enabled (403/404 -> /index.html with HTTP 200)")
    print(f"  • CDN Edge Caching:       Active (Gzip/Brotli compression enabled)")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    main()
