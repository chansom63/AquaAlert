#!/usr/bin/env python3
"""
Spin up an AWS EC2 VM (Ubuntu 24.04, Free Tier) and deploy AquaAlert automatically.

1. Finds or uses default VPC and subnet in ap-south-1.
2. Creates or finds security group 'aquaalert-web-sg' allowing HTTP (80), HTTPS (443), and SSH (22).
3. Looks up latest official Ubuntu 24.04 LTS AMI in ap-south-1.
4. Launches a t2.micro / t3.micro EC2 instance with user data script (scripts/ec2_user_data.sh).
5. Waits for public IP and prints the live deployment URL.
"""

from __future__ import annotations

import os
import sys
import time
from pathlib import Path

import boto3
from botocore.exceptions import ClientError

REGION = os.environ.get("AWS_REGION", "ap-south-1")
PROFILE = os.environ.get("AWS_PROFILE", "aquaalert")
USER_DATA_PATH = Path("scripts/ec2_user_data.sh")


def get_ec2_client():
    for prof in [PROFILE, "default", "aquaalert-dev"]:
        try:
            sess = boto3.Session(profile_name=prof, region_name=REGION)
            ec2 = sess.client("ec2")
            ec2.describe_vpcs()
            print(f"✓ Using AWS Profile: '{prof}' in region '{REGION}'")
            return ec2
        except Exception:
            continue

    # Try direct environment variables
    if os.environ.get("AWS_ACCESS_KEY_ID"):
        sess = boto3.Session(region_name=REGION)
        return sess.client("ec2")

    raise RuntimeError(
        "Could not authenticate with AWS. Please configure AWS credentials or launch via AWS Console."
    )


def get_ubuntu_ami(ec2) -> str:
    print("\n🔍 Finding latest Ubuntu 24.04 LTS AMI in ap-south-1...")
    resp = ec2.describe_images(
        Filters=[
            {"Name": "name", "Values": ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]},
            {"Name": "state", "Values": ["available"]},
            {"Name": "architecture", "Values": ["x86_64"]},
        ],
        Owners=["099720109477"],  # Canonical official owner ID
    )
    images = sorted(resp.get("Images", []), key=lambda x: x["CreationDate"], reverse=True)
    if not images:
        fallback_ami = "ami-0dee22c13ea7a9a67"  # Ubuntu 24.04 in ap-south-1
        print(f"Using standard Ubuntu 24.04 AMI: {fallback_ami}")
        return fallback_ami

    selected_ami = images[0]["ImageId"]
    print(f"✓ Selected AMI: {selected_ami} ({images[0]['Name']})")
    return selected_ami


def ensure_security_group(ec2) -> str:
    sg_name = "aquaalert-web-sg"
    print(f"\n🛡 Checking Security Group '{sg_name}'...")

    try:
        resp = ec2.describe_security_groups(GroupNames=[sg_name])
        sg_id = resp["SecurityGroups"][0]["GroupId"]
        print(f"✓ Found existing Security Group: {sg_id}")
        return sg_id
    except ClientError as e:
        if "InvalidGroup.NotFound" not in str(e):
            raise

    print(f"Creating Security Group '{sg_name}' (HTTP 80, HTTPS 443, SSH 22)...")
    vpcs = ec2.describe_vpcs(Filters=[{"Name": "is-default", "Values": ["true"]}])
    vpc_id = vpcs["Vpcs"][0]["VpcId"] if vpcs.get("Vpcs") else None

    kwargs = {
        "GroupName": sg_name,
        "Description": "AquaAlert Web Server Security Group (HTTP/HTTPS/SSH)",
    }
    if vpc_id:
        kwargs["VpcId"] = vpc_id

    sg_resp = ec2.create_security_group(**kwargs)
    sg_id = sg_resp["GroupId"]

    # Authorize inbound rules
    ec2.authorize_security_group_ingress(
        GroupId=sg_id,
        IpPermissions=[
            {
                "IpProtocol": "tcp",
                "FromPort": 80,
                "ToPort": 80,
                "IpRanges": [{"CidrIp": "0.0.0.0/0", "Description": "HTTP Web Traffic"}],
            },
            {
                "IpProtocol": "tcp",
                "FromPort": 443,
                "ToPort": 443,
                "IpRanges": [{"CidrIp": "0.0.0.0/0", "Description": "HTTPS Web Traffic"}],
            },
            {
                "IpProtocol": "tcp",
                "FromPort": 22,
                "ToPort": 22,
                "IpRanges": [{"CidrIp": "0.0.0.0/0", "Description": "SSH Remote Access"}],
            },
        ],
    )
    print(f"✓ Created Security Group: {sg_id}")
    return sg_id


def launch_instance(ec2, ami_id: str, sg_id: str) -> dict:
    print("\n🚀 Launching EC2 Virtual Machine (t2.micro / t3.micro)...")

    with open(USER_DATA_PATH, "r", encoding="utf-8") as f:
        user_data_script = f.read()

    # In ap-south-1, t2.micro or t3.micro is standard Free Tier
    instance_type = "t3.micro"

    resp = ec2.run_instances(
        ImageId=ami_id,
        InstanceType=instance_type,
        MinCount=1,
        MaxCount=1,
        SecurityGroupIds=[sg_id],
        UserData=user_data_script,
        TagSpecifications=[
            {
                "ResourceType": "instance",
                "Tags": [
                    {"Key": "Name", "Value": "AquaAlert-WebServer"},
                    {"Key": "Project", "Value": "AquaAlert"},
                ],
            }
        ],
    )

    instance = resp["Instances"][0]
    instance_id = instance["InstanceId"]
    print(f"✓ Instance launched: {instance_id}")

    print("Waiting for instance to initialize and receive Public IP...")
    waiter = ec2.get_waiter("instance_running")
    waiter.wait(InstanceIds=[instance_id])

    desc = ec2.describe_instances(InstanceIds=[instance_id])
    inst_info = desc["Reservations"][0]["Instances"][0]
    public_ip = inst_info.get("PublicIpAddress", "Pending")
    public_dns = inst_info.get("PublicDnsName", "")

    return {
        "InstanceId": instance_id,
        "PublicIp": public_ip,
        "PublicDns": public_dns,
        "InstanceType": instance_type,
    }


def main():
    print("=" * 65)
    print("  🚀 AquaAlert - AWS EC2 Virtual Machine Deployment")
    print("=" * 65)

    try:
        ec2 = get_ec2_client()
        ami_id = get_ubuntu_ami(ec2)
        sg_id = ensure_security_group(ec2)
        info = launch_instance(ec2, ami_id, sg_id)

        print("\n" + "=" * 65)
        print("🎉 EC2 VIRTUAL MACHINE SPUN UP SUCCESSFULLY!")
        print("=" * 65)
        print(f"  • Instance ID:   {info['InstanceId']}")
        print(f"  • Instance Type: {info['InstanceType']} (Free Tier Eligible)")
        print(f"  • Public IP:     {info['PublicIp']}")
        print(f"  • Live URL:      http://{info['PublicIp']}")
        print("=" * 65)
        print("\n💡 Note: The instance is currently executing user-data cloud-init.")
        print("Node.js and Nginx will finish installing and start serving in ~2-3 minutes.")
        print(f"Open: http://{info['PublicIp']}\n")

    except Exception as e:
        print(f"\n⚠️  Automated EC2 API Notice: {e}")
        print("\nYou can launch the VM directly in 1 minute using the AWS Console:")
        print("See the step-by-step instructions provided in chat.")


if __name__ == "__main__":
    main()
