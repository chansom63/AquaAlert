#!/usr/bin/env python3
"""
Seed the LabReports DynamoDB table with realistic records holding S3 object pointers.
Also uploads sample evidence PDF files to S3 bucket waterq-dev-evidence-files so the pointers resolve.
"""
import boto3
import json
import os
import shutil
import subprocess
import uuid
from decimal import Decimal
from datetime import datetime, timezone

REGION = "ap-south-1"
PROFILE = "aquaalert"
TABLE_NAME = "LabReports"
BUCKET_NAME = "waterq-dev-evidence-files"

def resolve_credentials(profile: str = "aquaalert") -> dict:
    aws_bin = shutil.which("aws") or "/snap/bin/aws"
    if os.path.exists(aws_bin):
        try:
            proc = subprocess.run(
                [aws_bin, "configure", "export-credentials", "--profile", profile],
                capture_output=True,
                text=True,
                timeout=5,
            )
            if proc.returncode == 0 and proc.stdout:
                data = json.loads(proc.stdout)
                opts = {
                    "aws_access_key_id": data["AccessKeyId"],
                    "aws_secret_access_key": data["SecretAccessKey"],
                }
                if data.get("SessionToken"):
                    opts["aws_session_token"] = data["SessionToken"]
                return opts
        except Exception:
            pass
    return {}

creds = resolve_credentials(PROFILE)
session = boto3.Session(region_name=REGION, **creds)
dynamodb = session.resource("dynamodb")
s3 = session.client("s3")
table = dynamodb.Table(TABLE_NAME)

SAMPLE_REPORTS = [
    {
        "reportId": "REP-GWL-LAB-001",
        "sourceId": "gmc-ward-14",
        "sourceName": "Maharaj Bada Central Plaza Hand Pump #04 (Lashkar)",
        "wardNumber": 14,
        "title": "Comprehensive Chemical & Microbiological Water Assay",
        "reportType": "Lab Report",
        "labName": "PHED Central Water Analytical Testing Laboratory",
        "nablCertNumber": "TC-8491",
        "chemistName": "Dr. S. Mukherjee (Senior Analytical Chemist)",
        "sampleId": "GWL-LAB-891",
        "collectedAt": "2026-11-04T07:30:00Z",
        "uploadedAt": "2026-11-04T09:20:00Z",
        "verificationStatus": "LAB_VERIFIED",
        "statutoryStandard": "BIS IS 10500:2012 Drinking Water Specification",
        "verdict": "Potable with Warning: Elevated TDS (620 mg/L) above 500 mg/L baseline",
        "testParameters": {
            "pH": Decimal("7.82"),
            "turbidity": Decimal("0.85"),
            "tds": Decimal("620"),
            "fluoride": Decimal("1.24"),
            "nitrate": Decimal("18.0"),
            "freeChlorine": Decimal("0.45"),
            "ecoli": Decimal("0"),
            "totalColiform": Decimal("0"),
            "conductivity": Decimal("945")
        },
        # S3 Object Pointer
        "s3Bucket": BUCKET_NAME,
        "s3Key": "reports/lab-reports/gmc-ward-14/lab_report_ward14_microbiology_20261104.pdf",
        "s3Uri": f"s3://{BUCKET_NAME}/reports/lab-reports/gmc-ward-14/lab_report_ward14_microbiology_20261104.pdf",
        "filename": "lab_report_ward14_microbiology_20261104.pdf",
        "contentType": "application/pdf",
        "fileSizeBytes": 1468006,
        "fileSizeFormatted": "1.4 MB",
        "sha256Checksum": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "notes": "Chain of custody sealed with tamper-evident seal #GMC-PHED-8910. UV-VIS Spectrophotometer calibrated at 540nm."
    },
    {
        "reportId": "REP-GWL-LAB-002",
        "sourceId": "gmc-ward-14",
        "sourceName": "Maharaj Bada Central Plaza Hand Pump #04 (Lashkar)",
        "wardNumber": 14,
        "title": "PHED Monthly Statutory Water Quality Certification (October 2026)",
        "reportType": "Lab Report",
        "labName": "PHED Central Water Analytical Testing Laboratory",
        "nablCertNumber": "TC-8491",
        "chemistName": "Dr. S. Mukherjee (Senior Analytical Chemist)",
        "sampleId": "GWL-LAB-874",
        "collectedAt": "2026-10-24T06:45:00Z",
        "uploadedAt": "2026-10-24T07:30:00Z",
        "verificationStatus": "LAB_VERIFIED",
        "statutoryStandard": "BIS IS 10500:2012 Drinking Water Specification",
        "verdict": "Potable Specification Verified with NABL Certificate",
        "testParameters": {
            "pH": Decimal("7.45"),
            "turbidity": Decimal("0.62"),
            "tds": Decimal("480"),
            "fluoride": Decimal("0.85"),
            "nitrate": Decimal("15.2"),
            "freeChlorine": Decimal("0.55"),
            "ecoli": Decimal("0"),
            "totalColiform": Decimal("0"),
            "conductivity": Decimal("760")
        },
        "s3Bucket": BUCKET_NAME,
        "s3Key": "reports/lab-reports/gmc-ward-14/phed_central_lab_cert_w14_oct2026.pdf",
        "s3Uri": f"s3://{BUCKET_NAME}/reports/lab-reports/gmc-ward-14/phed_central_lab_cert_w14_oct2026.pdf",
        "filename": "phed_central_lab_cert_w14_oct2026.pdf",
        "contentType": "application/pdf",
        "fileSizeBytes": 911360,
        "fileSizeFormatted": "890 KB",
        "sha256Checksum": "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0",
        "notes": "Regular surveillance batch. All parameters comply with statutory permissible thresholds."
    },
    {
        "reportId": "REP-GWL-LAB-003",
        "sourceId": "source-gwl-003",
        "sourceName": "Tigra Reservoir Water Works (Thatipur)",
        "wardNumber": 18,
        "title": "Raw & Treated Water Comprehensive Batch Assay",
        "reportType": "Lab Report",
        "labName": "Gwalior Municipal Water Works Quality Assurance Lab",
        "nablCertNumber": "TC-8491",
        "chemistName": "Anita Patel (Chief Analytical Chemist)",
        "sampleId": "GWL-LAB-892",
        "collectedAt": "2026-11-05T05:30:00Z",
        "uploadedAt": "2026-11-05T07:15:00Z",
        "verificationStatus": "LAB_VERIFIED",
        "statutoryStandard": "BIS IS 10500:2012 Drinking Water Specification",
        "verdict": "Optimal Potable Specification (All BIS IS 10500 limits met)",
        "testParameters": {
            "pH": Decimal("7.20"),
            "turbidity": Decimal("0.45"),
            "tds": Decimal("260"),
            "fluoride": Decimal("0.65"),
            "nitrate": Decimal("14.1"),
            "freeChlorine": Decimal("0.68"),
            "ecoli": Decimal("0"),
            "totalColiform": Decimal("0"),
            "conductivity": Decimal("410")
        },
        "s3Bucket": BUCKET_NAME,
        "s3Key": "reports/lab-reports/source-gwl-003/tigra_reservoir_monthly_assay_nov2026.pdf",
        "s3Uri": f"s3://{BUCKET_NAME}/reports/lab-reports/source-gwl-003/tigra_reservoir_monthly_assay_nov2026.pdf",
        "filename": "tigra_reservoir_monthly_assay_nov2026.pdf",
        "contentType": "application/pdf",
        "fileSizeBytes": 1843200,
        "fileSizeFormatted": "1.8 MB",
        "sha256Checksum": "f9e8d7c6b5a43210fedcba9876543210fedcba9876543210fedcba9876543210",
        "notes": "Automated continuous sampler output corroborated with benchtop titrimetry."
    },
    {
        "reportId": "REP-GWL-LAB-004",
        "sourceId": "source-gwl-007",
        "sourceName": "Laxmi Ganj Borewell (Zone 03)",
        "wardNumber": 7,
        "title": "Groundwater Heavy Metals & Nitrate Surveillance Report",
        "reportType": "Lab Report",
        "labName": "PHED Central Water Analytical Testing Laboratory",
        "nablCertNumber": "TC-8491",
        "chemistName": "P. Verma (Surveillance Chemist)",
        "sampleId": "GWL-LAB-893",
        "collectedAt": "2026-11-04T14:15:00Z",
        "uploadedAt": "2026-11-04T16:00:00Z",
        "verificationStatus": "LAB_VERIFIED",
        "statutoryStandard": "BIS IS 10500:2012 Drinking Water Specification",
        "verdict": "Potable Standard Verified with NABL Certificate",
        "testParameters": {
            "pH": Decimal("7.65"),
            "turbidity": Decimal("0.65"),
            "tds": Decimal("410"),
            "fluoride": Decimal("0.85"),
            "nitrate": Decimal("28.0"),
            "freeChlorine": Decimal("0.35"),
            "ecoli": Decimal("0"),
            "totalColiform": Decimal("0"),
            "conductivity": Decimal("650")
        },
        "s3Bucket": BUCKET_NAME,
        "s3Key": "reports/lab-reports/source-gwl-007/laxmi_ganj_heavy_metals_screening.pdf",
        "s3Uri": f"s3://{BUCKET_NAME}/reports/lab-reports/source-gwl-007/laxmi_ganj_heavy_metals_screening.pdf",
        "filename": "laxmi_ganj_heavy_metals_screening.pdf",
        "contentType": "application/pdf",
        "fileSizeBytes": 1258291,
        "fileSizeFormatted": "1.2 MB",
        "sha256Checksum": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "notes": "Nitrate level elevated at 28 mg/L but well below 45 mg/L statutory limit."
    },
    {
        "reportId": "REP-GWL-FLD-001",
        "sourceId": "gmc-ward-01",
        "sourceName": "Morar Riverfront Community Well #01",
        "wardNumber": 1,
        "title": "Daily Field Screening Logsheet & Multiparameter Probe Inspection",
        "reportType": "Field Sheet",
        "labName": "Field Unit #01 (Morar Division)",
        "nablCertNumber": "N/A - Field Unit",
        "chemistName": "R. Sharma (Field Environmental Technician)",
        "sampleId": "FLD-GWL-0101",
        "collectedAt": "2026-11-03T15:00:00Z",
        "uploadedAt": "2026-11-03T16:15:00Z",
        "verificationStatus": "LAB_VERIFIED",
        "statutoryStandard": "Field Screening Protocol",
        "verdict": "Field Reading Consistent with Baseline",
        "testParameters": {
            "pH": Decimal("7.30"),
            "turbidity": Decimal("0.90"),
            "tds": Decimal("380"),
            "freeChlorine": Decimal("0.40")
        },
        "s3Bucket": BUCKET_NAME,
        "s3Key": "reports/field-sheets/gmc-ward-01/gmc_field_sheet_ward01_nov2026.pdf",
        "s3Uri": f"s3://{BUCKET_NAME}/reports/field-sheets/gmc-ward-01/gmc_field_sheet_ward01_nov2026.pdf",
        "filename": "gmc_field_sheet_ward01_nov2026.pdf",
        "contentType": "application/pdf",
        "fileSizeBytes": 438272,
        "fileSizeFormatted": "428 KB",
        "sha256Checksum": "456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123",
        "notes": "Handheld multiparameter digital sonde calibrated before field run."
    },
    {
        "reportId": "REP-GWL-AUD-001",
        "sourceId": "gmc-ward-28",
        "sourceName": "City Center Sub-Surface Supply Line #03",
        "wardNumber": 28,
        "title": "Quarterly Regulatory Water Safety Audit Package (Q3 2026)",
        "reportType": "Compliance Audit",
        "labName": "State Water Quality Monitoring Directorate",
        "nablCertNumber": "NABL-AUD-2026-09",
        "chemistName": "Quality Assurance Cell & Municipal Engineering Board",
        "sampleId": "AUD-GWL-2026-Q3",
        "collectedAt": "2026-10-28T10:00:00Z",
        "uploadedAt": "2026-10-28T11:00:00Z",
        "verificationStatus": "LAB_VERIFIED",
        "statutoryStandard": "BIS IS 10500:2012 & CGWB Norms",
        "verdict": "Full Statutory Compliance Certified across 66 Municipal Wards",
        "testParameters": {
            "pH": Decimal("7.40"),
            "turbidity": Decimal("0.50"),
            "tds": Decimal("320"),
            "nitrate": Decimal("12.0"),
            "fluoride": Decimal("0.70")
        },
        "s3Bucket": BUCKET_NAME,
        "s3Key": "reports/compliance-audits/compliance_audit_bis10500_q3_2026.pdf",
        "s3Uri": f"s3://{BUCKET_NAME}/reports/compliance-audits/compliance_audit_bis10500_q3_2026.pdf",
        "filename": "compliance_audit_bis10500_q3_2026.pdf",
        "contentType": "application/pdf",
        "fileSizeBytes": 2936012,
        "fileSizeFormatted": "2.8 MB",
        "sha256Checksum": "89abcdef0123456789abcdef0123456789abcdef0123456789abcdef01234567",
        "notes": "State oversight review. Passed all statutory chemical, physical, and radiological parameters."
    }
]

def generate_minimal_pdf_bytes(title: str, report_id: str) -> bytes:
    # Minimal standard PDF file with title and metadata
    content = f"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>/Contents 4 0 R>>endobj\n4 0 obj<</Length 85>>stream\nBT /F1 12 Tf 50 700 Td ({title} - Report ID: {report_id}) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000108 00000 n \n0000000201 00000 n \ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n336\n%%EOF\n"
    return content.encode("utf-8")

def main():
    print(f"Connecting to DynamoDB table '{TABLE_NAME}' in {REGION}...")
    
    for report in SAMPLE_REPORTS:
        report_id = report["reportId"]
        s3_key = report["s3Key"]
        print(f"Uploading mock PDF to S3: s3://{BUCKET_NAME}/{s3_key}...")
        pdf_bytes = generate_minimal_pdf_bytes(report["title"], report_id)
        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=s3_key,
            Body=pdf_bytes,
            ContentType="application/pdf"
        )
        
        print(f"Ingesting record into DynamoDB: {report_id} -> {s3_key}...")
        table.put_item(Item=report)
        print(f"  [OK] Ingested {report_id}")

    print("\nVerification: Scanning DynamoDB LabReports table...")
    resp = table.scan(Limit=10)
    items = resp.get("Items", [])
    print(f"Successfully verified {len(items)} items in '{TABLE_NAME}' table holding S3 object pointers:")
    for it in items:
        print(f" - {it['reportId']}: {it['title']} -> S3: {it['s3Key']} ({it['fileSizeFormatted']})")

if __name__ == "__main__":
    main()
