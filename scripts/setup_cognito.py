#!/usr/bin/env python3
"""
Provision and configure AWS Cognito User Pool, App Client, and Groups for AquaAlert.
Region: ap-south-1

Resources created:
  1. User Pool: 'AquaAlert-UserPool'
     - Email sign-in alias
     - Password policy (8+ chars, upper, lower, numbers, symbols)
     - Auto-verified email
  2. App Client: 'AquaAlert-WebClient'
     - Public client (no client secret, suitable for SPAs)
     - Auth flows: USER_PASSWORD_AUTH, REFRESH_TOKEN_AUTH, USER_SRP_AUTH
  3. User Groups:
     - 'Admins' (Precedence 1)
     - 'Analysts' (Precedence 2)
     - 'Operators' (Precedence 3)
     - 'Citizens' (Precedence 10)
  4. Seed Users:
     - Admin: admin@aquaalert.gov.in (Added to 'Admins' group)
     - Citizen: citizen@gwalior.in (Added to 'Citizens' group)
  5. Updates root .env and backend/.env with Cognito IDs.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

import boto3
from botocore.exceptions import ClientError

REGION = os.environ.get("AWS_REGION", "ap-south-1")
PROFILE = os.environ.get("AWS_PROFILE", "aquaalert")

USER_POOL_NAME = "AquaAlert-UserPool"
CLIENT_NAME = "AquaAlert-WebClient"

GROUPS = [
    {
        "GroupName": "Admins",
        "Description": "Municipal System Administrators with full CRUD access",
        "Precedence": 1,
    },
    {
        "GroupName": "Analysts",
        "Description": "Accredited Lab Analysts with evidence/report upload access",
        "Precedence": 2,
    },
    {
        "GroupName": "Operators",
        "Description": "Field Surveillance Operators with reading submission access",
        "Precedence": 3,
    },
    {
        "GroupName": "Citizens",
        "Description": "Public Citizens with water grievance reporting access",
        "Precedence": 10,
    },
]

SEED_USERS = [
    {
        "email": "admin@aquaalert.gov.in",
        "name": "Central Municipal Administrator",
        "role": "Admins",
        "temp_password": "AquaAlert@Admin2026!",
    },
    {
        "email": "citizen@gwalior.in",
        "name": "Gwalior Citizen Resident",
        "role": "Citizens",
        "temp_password": "AquaAlert@Citizen2026!",
    },
]


def update_env_file(path: Path, updates: dict[str, str]):
    if not path.exists():
        lines = []
    else:
        lines = path.read_text(encoding="utf-8").splitlines()

    new_lines = []
    seen = set()
    for line in lines:
        if "=" in line and not line.strip().startswith("#"):
            k, _ = line.split("=", 1)
            k = k.strip()
            if k in updates:
                new_lines.append(f"{k}={updates[k]}")
                seen.add(k)
                continue
        new_lines.append(line)

    for k, v in updates.items():
        if k not in seen:
            new_lines.append(f"{k}={v}")

    path.write_text("\n".join(new_lines) + "\n", encoding="utf-8")
    print(f"Updated {path} with Cognito configuration.")


def main():
    print(f"Connecting to AWS Cognito in {REGION} (profile: {PROFILE})...")
    try:
        session = boto3.Session(profile_name=PROFILE, region_name=REGION)
        client = session.client("cognito-idp")
        # Test credentials
        client.list_user_pools(MaxResults=1)
    except Exception as exc:
        print(f"\n[!] AWS credentials error: {exc}")
        print("Please ensure your AWS session is active ('aws login --profile aquaalert').")
        sys.exit(1)

    # 1. Create or get User Pool
    pool_id = None
    pools = client.list_user_pools(MaxResults=50).get("UserPools", [])
    for p in pools:
        if p["Name"] == USER_POOL_NAME:
            pool_id = p["Id"]
            print(f"Found existing User Pool: {USER_POOL_NAME} (ID: {pool_id})")
            break

    if not pool_id:
        print(f"Creating User Pool: {USER_POOL_NAME}...")
        res = client.create_user_pool(
            PoolName=USER_POOL_NAME,
            Policies={
                "PasswordPolicy": {
                    "MinimumLength": 8,
                    "RequireUppercase": True,
                    "RequireLowercase": True,
                    "RequireNumbers": True,
                    "RequireSymbols": True,
                    "TemporaryPasswordValidityDays": 7,
                }
            },
            AutoVerifiedAttributes=["email"],
            UsernameAttributes=["email"],
            VerificationMessageTemplate={
                "DefaultEmailOption": "CONFIRM_WITH_CODE",
                "EmailSubject": "AquaAlert Gwalior - Verification Code",
                "EmailMessage": "Your AquaAlert verification code is {####}. Use this code to complete registration.",
            },
            Schema=[
                {
                    "Name": "name",
                    "AttributeDataType": "String",
                    "DeveloperOnlyAttribute": False,
                    "Mutable": True,
                    "Required": True,
                },
                {
                    "Name": "phone_number",
                    "AttributeDataType": "String",
                    "DeveloperOnlyAttribute": False,
                    "Mutable": True,
                    "Required": False,
                },
            ],
            AdminCreateUserConfig={
                "AllowAdminCreateUserOnly": False,
            },
        )
        pool_id = res["UserPool"]["Id"]
        print(f"Created User Pool successfully (ID: {pool_id})")

    # 2. Create or get App Client (No Client Secret for SPA)
    client_id = None
    clients = client.list_user_pool_clients(UserPoolId=pool_id, MaxResults=50).get(
        "UserPoolClients", []
    )
    for c in clients:
        if c["ClientName"] == CLIENT_NAME:
            client_id = c["ClientId"]
            print(f"Found existing App Client: {CLIENT_NAME} (ID: {client_id})")
            break

    if not client_id:
        print(f"Creating App Client: {CLIENT_NAME} (Public SPA without client secret)...")
        res = client.create_user_pool_client(
            UserPoolId=pool_id,
            ClientName=CLIENT_NAME,
            GenerateSecret=False,
            ExplicitAuthFlows=[
                "ALLOW_USER_PASSWORD_AUTH",
                "ALLOW_REFRESH_TOKEN_AUTH",
                "ALLOW_USER_SRP_AUTH",
            ],
            PreventUserExistenceErrors="ENABLED",
            EnableTokenRevocation=True,
            AccessTokenValidity=24,
            IdTokenValidity=24,
            RefreshTokenValidity=30,
            TokenValidityUnits={
                "AccessToken": "hours",
                "IdToken": "hours",
                "RefreshToken": "days",
            },
        )
        client_id = res["UserPoolClient"]["ClientId"]
        print(f"Created App Client successfully (ID: {client_id})")

    # 3. Create User Groups
    existing_groups = {
        g["GroupName"]
        for g in client.list_groups(UserPoolId=pool_id).get("Groups", [])
    }
    for g in GROUPS:
        if g["GroupName"] in existing_groups:
            print(f"Group '{g['GroupName']}' already exists.")
        else:
            print(f"Creating group '{g['GroupName']}'...")
            client.create_group(
                UserPoolId=pool_id,
                GroupName=g["GroupName"],
                Description=g["Description"],
                Precedence=g["Precedence"],
            )
            print(f"Group '{g['GroupName']}' created.")

    # 4. Create Initial Seed Users
    for user_info in SEED_USERS:
        email = user_info["email"]
        try:
            client.admin_get_user(UserPoolId=pool_id, Username=email)
            print(f"Seed user '{email}' already exists.")
        except ClientError as e:
            if e.response["Error"]["Code"] == "UserNotFoundException":
                print(f"Creating seed user '{email}'...")
                client.admin_create_user(
                    UserPoolId=pool_id,
                    Username=email,
                    UserAttributes=[
                        {"Name": "email", "Value": email},
                        {"Name": "email_verified", "Value": "true"},
                        {"Name": "name", "Value": user_info["name"]},
                    ],
                    MessageAction="SUPPRESS",
                )
                # Set permanent password
                client.admin_set_user_password(
                    UserPoolId=pool_id,
                    Username=email,
                    Password=user_info["temp_password"],
                    Permanent=True,
                )
                # Add to group
                client.admin_add_user_to_group(
                    UserPoolId=pool_id,
                    Username=email,
                    GroupName=user_info["role"],
                )
                print(
                    f"Created user '{email}' with role '{user_info['role']}' and password '{user_info['temp_password']}'."
                )
            else:
                print(f"Error checking user '{email}': {e}")

    # 5. Update environment files
    root = Path(__file__).resolve().parents[1]
    env_updates = {
        "VITE_COGNITO_USER_POOL_ID": pool_id,
        "VITE_COGNITO_CLIENT_ID": client_id,
        "VITE_AWS_REGION": REGION,
        "COGNITO_USER_POOL_ID": pool_id,
        "COGNITO_CLIENT_ID": client_id,
    }
    update_env_file(root / ".env", env_updates)
    update_env_file(root / "backend" / ".env", env_updates)

    print("\n=======================================================")
    print("✅ AWS Cognito Authentication & Authorization Configured!")
    print(f"User Pool ID : {pool_id}")
    print(f"App Client ID: {client_id}")
    print(f"AWS Region   : {REGION}")
    print("\nDefault Seed Accounts:")
    for u in SEED_USERS:
        print(f" - {u['role']:<10}: {u['email']} | Password: {u['temp_password']}")
    print("=======================================================")


if __name__ == "__main__":
    main()
