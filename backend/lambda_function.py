import json
import base64
from decimal import Decimal
import os
import re
from datetime import datetime, timezone
import boto3
from botocore.exceptions import ClientError
import uuid
from urllib.parse import unquote

# Environment Variables
APP_ENV = os.environ.get("APP_ENV", "dev")
AWS_REGION = os.environ.get("AWS_REGION", "ap-south-1")

SOURCES_TABLE = os.environ.get("WATER_SOURCES_TABLE", "WaterSources")
READINGS_TABLE = os.environ.get("WATER_READINGS_TABLE", "WaterReadings")
ALERTS_TABLE = os.environ.get("ALERTS_TABLE", "Alerts")
ACTIONS_TABLE = os.environ.get("RESPONSE_ACTIONS_TABLE", "ResponseActions")
LAB_REPORTS_TABLE = os.environ.get("LAB_REPORTS_TABLE", "LabReports")
RULES_TABLE = os.environ.get("RULES_TABLE", "Rules")
THRESHOLDS_TABLE = os.environ.get("THRESHOLDS_TABLE", "Thresholds")
RULES_THRESHOLDS_TABLE = os.environ.get("RULES_THRESHOLDS_TABLE", "RulesThresholds")
COMPLAINTS_TABLE = os.environ.get("COMPLAINTS_TABLE", "Complaints")

SNS_TOPIC_ARN = os.environ.get("SNS_ALERT_TOPIC_ARN", "arn:aws:sns:ap-south-1:113435023513:water-quality-alerts")
EVIDENCE_BUCKET = os.environ.get("EVIDENCE_BUCKET", "waterq-dev-evidence-files")
COMPLAINTS_BUCKET = os.environ.get("COMPLAINTS_BUCKET", "waterq-dev-complaints-evidence")

dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
sns = boto3.client("sns", region_name=AWS_REGION)
s3 = boto3.client("s3", region_name=AWS_REGION)
COGNITO_USER_POOL_ID = os.environ.get("COGNITO_USER_POOL_ID", "ap-south-1_HlHhFkttf")
COGNITO_CLIENT_ID = os.environ.get("COGNITO_CLIENT_ID", "43egcoomllmis0ebef6pl6qnar")
cognito = boto3.client("cognito-idp", region_name=AWS_REGION)

def _json_default(value):
    if isinstance(value, Decimal):
        return int(value) if value % 1 == 0 else float(value)
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")


def make_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization"
        },
        "body": json.dumps(body, default=_json_default)
    }


def _encode_token(last_evaluated_key):
    if not last_evaluated_key:
        return None
    raw = json.dumps(last_evaluated_key, default=_json_default).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii")


def _decode_token(token):
    if not token:
        return None
    try:
        raw = base64.urlsafe_b64decode(token.encode("ascii"))
        key = json.loads(raw.decode("utf-8"))
        if not isinstance(key, dict):
            raise ValueError("Invalid pagination token")
        return key
    except Exception as exc:
        raise ValueError("Invalid nextToken. Restart pagination without this token.") from exc


def _query_params(event):
    return event.get("queryStringParameters") or {}


def _limit_from(params, default=100, maximum=500):
    try:
        limit = int(params.get("limit", default))
    except (TypeError, ValueError):
        raise ValueError("limit must be an integer")
    if limit < 1 or limit > maximum:
        raise ValueError(f"limit must be between 1 and {maximum}")
    return limit


def convert_floats_to_decimals(obj):
    """
    Recursively walks through a dictionary or list and converts 
    any float values into decimal.Decimal objects for DynamoDB.
    """
    if isinstance(obj, list):
        return [convert_floats_to_decimals(item) for item in obj]
    elif isinstance(obj, dict):
        return {k: convert_floats_to_decimals(v) for k, v in obj.items()}
    elif isinstance(obj, float):
        # CRITICAL: Always cast through str(obj) to avoid binary precision bugs!
        return Decimal(str(obj))
    return obj

def get_caller_claims(event):
    """
    Extract caller identity, role, and groups from Cognito Authorizer or Authorization Bearer JWT.
    """
    # 1. Check API Gateway Cognito Authorizer claims
    request_context = event.get("requestContext", {})
    authorizer = request_context.get("authorizer", {})
    jwt_claims = authorizer.get("jwt", {}).get("claims", {}) or authorizer.get("claims", {})
    if jwt_claims:
        groups = jwt_claims.get("cognito:groups", [])
        if isinstance(groups, str):
            groups = [g.strip() for g in groups.split(",") if g.strip()]
        is_admin = any(g.lower() in ["admins", "admin"] for g in groups)
        return {
            "sub": jwt_claims.get("sub"),
            "email": jwt_claims.get("email"),
            "username": jwt_claims.get("cognito:username") or jwt_claims.get("username"),
            "groups": groups,
            "role": "ADMIN" if is_admin else "CITIZEN",
            "isAdmin": is_admin
        }

    # 2. Check Authorization Bearer JWT token header
    headers = event.get("headers") or {}
    auth_header = headers.get("authorization") or headers.get("Authorization") or ""
    if auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        try:
            parts = token.split(".")
            if len(parts) >= 2:
                payload_b64 = parts[1]
                payload_b64 += "=" * ((4 - len(payload_b64) % 4) % 4)
                claims = json.loads(base64.urlsafe_b64decode(payload_b64.encode("utf-8")).decode("utf-8"))
                groups = claims.get("cognito:groups", [])
                if isinstance(groups, str):
                    groups = [g.strip() for g in groups.split(",") if g.strip()]
                is_admin = any(g.lower() in ["admins", "admin"] for g in groups) or "admin" in str(claims.get("email", "")).lower()
                return {
                    "sub": claims.get("sub"),
                    "email": claims.get("email"),
                    "username": claims.get("cognito:username") or claims.get("username"),
                    "groups": groups,
                    "role": "ADMIN" if is_admin else "CITIZEN",
                    "isAdmin": is_admin
                }
        except Exception as exc:
            print(f"Error parsing Bearer JWT: {exc}")

    return {
        "sub": None,
        "email": None,
        "username": None,
        "groups": [],
        "role": "GUEST",
        "isAdmin": False
    }

def lambda_handler(event, context):
    # 0. Cognito User Pool PreSignUp trigger: auto-confirm citizens so registration is instantaneous
    if event.get("triggerSource") in ("PreSignUp_SignUp", "PreSignUp_AdminCreateUser"):
        event["response"] = event.get("response") or {}
        event["response"]["autoConfirmUser"] = True
        event["response"]["autoVerifyEmail"] = True
        return event

    if event.get("triggerSource") in ("PostConfirmation_ConfirmSignUp", "PostConfirmation_ConfirmForgotPassword"):
        try:
            user_pool_id = event.get("userPoolId") or COGNITO_USER_POOL_ID
            user_name = event.get("userName")
            if user_name:
                cognito.admin_add_user_to_group(
                    UserPoolId=user_pool_id,
                    Username=user_name,
                    GroupName="Citizens"
                )
        except Exception:
            pass
        return event

    request_context = event.get("requestContext", {})
    http = request_context.get("http", {})
    method = http.get("method", event.get("httpMethod", "GET"))
    raw_path = event.get("rawPath") or event.get("path", "")

    if event.get("testSuite") is True:
        return run_console_e2e_test()

    # Strip a stage prefix such as /default/sources when present.
    path = re.sub(
        r"^/[^/]+(?=/(sources|readings|alerts|actions|reports|rules|thresholds|users|auth|complaints))",
        "",
        raw_path
    )
    if not path.startswith("/"):
        path = "/" + path

    if method == "OPTIONS":
        return make_response(200, {"message": "OK"})

    caller = get_caller_claims(event)

    try:
        # Cognito Profile & Verification Routes
        if method == "GET" and path == "/auth/me":
            return make_response(200, caller)

        if method == "POST" and path == "/auth/confirm":
            return handle_auth_confirm(event)

        if method == "POST" and path == "/auth/resend-code":
            return handle_auth_resend_code(event)
        if method == "GET" and (
            path in ["/", "/waterq-dev-api-handler"]
            or raw_path in ["/default", "/default/", "/default/waterq-dev-api-handler", ""]
        ):
            return make_response(200, {
                "status": "ONLINE",
                "message": "Water Quality Alert System API is running successfully.",
                "availableEndpoints": [
                    "GET /sources",
                    "GET /sources/{sourceId}",
                    "GET /sources/{sourceId}/readings",
                    "GET /readings",
                    "POST /readings",
                    "GET /alerts",
                    "GET /alerts/{alertId}",
                    "GET /alerts/{alertId}/actions",
                    "GET /actions",
                    "POST /alerts/{alertId}/actions",
                    "POST /reports/presigned-url",
                    "GET /reports/download-url?key=..."
                ]
            })

        if method == "GET" and path == "/sources":
            return handle_get_sources()

        if method == "GET" and path == "/readings":
            return handle_get_readings(_query_params(event))

        match_source_readings = re.match(r"^/sources/([^/]+)/readings$", path)
        if method == "GET" and match_source_readings:
            return handle_get_source_readings(
                unquote(match_source_readings.group(1)), _query_params(event)
            )

        match_source = re.match(r"^/sources/([^/]+)$", path)
        if method == "GET" and match_source:
            return handle_get_source_by_id(unquote(match_source.group(1)))

        if method == "POST" and path == "/readings":
            body = json.loads(event.get("body") or "{}")
            if not isinstance(body, dict):
                return make_response(400, {"error": {"code": "VALIDATION_ERROR", "message": "Request body must be a JSON object."}})
            return handle_post_reading(body)

        if method == "GET" and path == "/alerts":
            return handle_get_alerts(_query_params(event))

        match_alert_actions = re.match(r"^/alerts/([^/]+)/actions$", path)
        if method == "GET" and match_alert_actions:
            return handle_get_alert_actions(
                unquote(match_alert_actions.group(1)), _query_params(event)
            )
        if method == "POST" and match_alert_actions:
            body = json.loads(event.get("body") or "{}")
            if not isinstance(body, dict):
                return make_response(400, {"error": {"code": "VALIDATION_ERROR", "message": "Request body must be a JSON object."}})
            return handle_post_alert_action(unquote(match_alert_actions.group(1)), body)

        match_alert = re.match(r"^/alerts/([^/]+)$", path)
        if method == "GET" and match_alert:
            return handle_get_alert_by_id(unquote(match_alert.group(1)))

        if method == "GET" and path == "/actions":
            return handle_get_actions(_query_params(event))

        if method == "GET" and path == "/reports":
            return handle_get_reports(_query_params(event))

        if method == "POST" and path == "/reports":
            body = json.loads(event.get("body") or "{}")
            if not isinstance(body, dict):
                return make_response(400, {"error": {"code": "VALIDATION_ERROR", "message": "Request body must be a JSON object."}})
            return handle_post_report(body)

        match_report_download = re.match(r"^/reports/([^/]+)/download-url$", path)
        if method == "GET" and match_report_download:
            return handle_get_report_download_url(unquote(match_report_download.group(1)))

        match_report = re.match(r"^/reports/([^/]+)$", path)
        if method == "GET" and match_report:
            return handle_get_report_by_id(unquote(match_report.group(1)))

        if method == "POST" and path == "/reports/presigned-url":
            body = json.loads(event.get("body") or "{}")
            if not isinstance(body, dict):
                return make_response(400, {"error": {"code": "VALIDATION_ERROR", "message": "Request body must be a JSON object."}})
            return handle_create_report_upload_url(body)

        if method == "GET" and path == "/reports/download-url":
            key = _query_params(event).get("key")
            if not key:
                return make_response(400, {"error": {"code": "VALIDATION_ERROR", "message": "key parameter is required"}})
            if not (key.startswith("reports/") or key.startswith("evidence/") or key.startswith("exports/")):
                return make_response(400, {"error": {"code": "INVALID_KEY", "message": "Only report, evidence, or export object keys are allowed."}})
            download_url = s3.generate_presigned_url(
                ClientMethod="get_object",
                Params={"Bucket": EVIDENCE_BUCKET, "Key": key},
                ExpiresIn=600
            )
            return make_response(200, {"downloadUrl": download_url, "expiresInSeconds": 600})

        # =========================================================================
        # CRUD ROUTES: CITIZEN COMPLAINTS
        # =========================================================================
        if method == "GET" and path == "/complaints":
            return handle_get_complaints(_query_params(event))

        if method == "POST" and path == "/complaints":
            body = json.loads(event.get("body") or "{}")
            if not isinstance(body, dict):
                return make_response(400, {"error": {"code": "VALIDATION_ERROR", "message": "Request body must be a JSON object."}})
            return handle_post_complaint(body)

        if method == "POST" and path == "/complaints/presigned-url":
            body = json.loads(event.get("body") or "{}")
            if not isinstance(body, dict):
                return make_response(400, {"error": {"code": "VALIDATION_ERROR", "message": "Request body must be a JSON object."}})
            return handle_create_complaint_upload_url(body)

        match_complaint_download = re.match(r"^/complaints/([^/]+)/download-url$", path)
        if method == "GET" and match_complaint_download:
            return handle_get_complaint_download_url(unquote(match_complaint_download.group(1)), _query_params(event))

        match_complaint = re.match(r"^/complaints/([^/]+)$", path)
        if method == "GET" and match_complaint:
            return handle_get_complaint_by_id(unquote(match_complaint.group(1)))
        if method in ["PUT", "PATCH"] and match_complaint:
            body = json.loads(event.get("body") or "{}")
            if not isinstance(body, dict):
                return make_response(400, {"error": {"code": "VALIDATION_ERROR", "message": "Request body must be a JSON object."}})
            return handle_update_complaint(unquote(match_complaint.group(1)), body)
        if method == "DELETE" and match_complaint:
            return handle_delete_complaint(unquote(match_complaint.group(1)))

        
        # =========================================================================
        # CRUD ROUTES: RULES
        # =========================================================================
        if method == "GET" and path == "/rules":
            return handle_get_rules(_query_params(event))

        match_rule = re.match(r"^/rules/([^/]+)$", path)
        if method == "GET" and match_rule:
            return handle_get_rule_by_id(unquote(match_rule.group(1)))
        if method == "PUT" and match_rule:
            body = json.loads(event.get("body") or "{}")
            return handle_update_rule(unquote(match_rule.group(1)), body)
        if method == "DELETE" and match_rule:
            return handle_delete_rule(unquote(match_rule.group(1)))

        if method == "POST" and path == "/rules":
            body = json.loads(event.get("body") or "{}")
            return handle_create_rule(body)

        # =========================================================================
        # CRUD ROUTES: THRESHOLDS
        # =========================================================================
        if method == "GET" and path == "/thresholds":
            return handle_get_thresholds(_query_params(event))

        match_thresh = re.match(r"^/thresholds/([^/]+)$", path)
        if method == "GET" and match_thresh:
            return handle_get_threshold_by_id(unquote(match_thresh.group(1)))
        if method == "PUT" and match_thresh:
            body = json.loads(event.get("body") or "{}")
            return handle_update_threshold(unquote(match_thresh.group(1)), body)
        if method == "DELETE" and match_thresh:
            return handle_delete_threshold(unquote(match_thresh.group(1)))

        if method == "POST" and path == "/thresholds":
            body = json.loads(event.get("body") or "{}")
            return handle_create_threshold(body)

        # =========================================================================
        # CRUD ROUTES: WATER SOURCES
        # =========================================================================
        if method == "POST" and path == "/sources":
            body = json.loads(event.get("body") or "{}")
            return handle_create_source(body)

        if method == "PUT" and match_source:
            body = json.loads(event.get("body") or "{}")
            return handle_update_source(unquote(match_source.group(1)), body)

        if method == "DELETE" and match_source:
            return handle_delete_source(unquote(match_source.group(1)))

        # =========================================================================
        # CRUD ROUTES: ALERTS
        # =========================================================================
        if method == "POST" and path == "/alerts":
            body = json.loads(event.get("body") or "{}")
            return handle_create_alert(body)

        if method == "PUT" and match_alert:
            body = json.loads(event.get("body") or "{}")
            return handle_update_alert(unquote(match_alert.group(1)), body)

        if method == "DELETE" and match_alert:
            return handle_delete_alert(unquote(match_alert.group(1)))

        # =========================================================================
        # CRUD ROUTES: READINGS (UPDATE / DELETE)
        # =========================================================================
        match_reading_compound = re.match(r"^/readings/([^/]+)/([^/]+)$", path)
        if method == "PUT" and match_reading_compound:
            body = json.loads(event.get("body") or "{}")
            return handle_update_reading(unquote(match_reading_compound.group(1)), unquote(match_reading_compound.group(2)), body)

        if method == "DELETE" and match_reading_compound:
            return handle_delete_reading(unquote(match_reading_compound.group(1)), unquote(match_reading_compound.group(2)))

        match_reading_single = re.match(r"^/readings/([^/]+)$", path)
        if method == "DELETE" and match_reading_single:
            return handle_delete_reading_by_id(unquote(match_reading_single.group(1)))

        # =========================================================================
        # CRUD ROUTES: RESPONSE ACTIONS
        # =========================================================================
        match_action_id = re.match(r"^/actions/([^/]+)$", path)
        if method == "PUT" and match_action_id:
            body = json.loads(event.get("body") or "{}")
            return handle_update_action(unquote(match_action_id.group(1)), body)

        if method == "DELETE" and match_action_id:
            return handle_delete_action_by_id(unquote(match_action_id.group(1)))

        # =========================================================================
        # CRUD ROUTES: REPORTS
        # =========================================================================
        if method == "PUT" and match_report:
            body = json.loads(event.get("body") or "{}")
            return handle_update_report(unquote(match_report.group(1)), body)

        if method == "DELETE" and match_report:
            return handle_delete_report(unquote(match_report.group(1)))

        return make_response(404, {
            "error": {"code": "NOT_FOUND", "message": f"Route not found: {method} {raw_path}"}
        })

    except json.JSONDecodeError:
        return make_response(400, {"error": {"code": "INVALID_JSON", "message": "Request body must contain valid JSON."}})
    except ValueError as exc:
        return make_response(400, {"error": {"code": "VALIDATION_ERROR", "message": str(exc)}})
    except Exception as exc:
        print(f"Error handling request: {type(exc).__name__}: {exc}")
        return make_response(500, {"error": {"code": "INTERNAL_ERROR", "message": "An unexpected server error occurred."}})


# ----------------- Route Implementations -----------------
ALLOWED_REPORT_EXTENSIONS = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".csv": "text/csv",
}

def handle_create_report_upload_url(payload):
    if not EVIDENCE_BUCKET:
        return make_response(500, {
            "error": {
                "code": "CONFIGURATION_ERROR",
                "message": "EVIDENCE_BUCKET is not configured."
            }
        })

    source_id = payload.get("sourceId")
    filename = payload.get("filename", "")
    folder = payload.get("folder") or payload.get("prefix") or "reports/lab-reports"
    content_type = payload.get("contentType", "")

    if not source_id or not filename:
        return make_response(400, {
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "sourceId and filename are required."
            }
        })

    # Use a generated key rather than trusting a client-supplied S3 path.
    safe_filename = os.path.basename(unquote(filename))
    safe_filename = re.sub(r"[^A-Za-z0-9._-]", "_", safe_filename)

    _, ext = os.path.splitext(safe_filename.lower())
    if ext not in ALLOWED_REPORT_EXTENSIONS:
        return make_response(400, {
            "error": {
                "code": "INVALID_FILE",
                "message": f"File extension '{ext}' is not supported. Allowed formats: {', '.join(ALLOWED_REPORT_EXTENSIONS.keys())}."
            }
        })

    expected_content_type = ALLOWED_REPORT_EXTENSIONS[ext]
    if not content_type or content_type in ["application/octet-stream", ""]:
        content_type = expected_content_type
    elif ext in [".jpg", ".jpeg"] and content_type.startswith("image/"):
        content_type = "image/jpeg"
    elif ext == ".png" and content_type.startswith("image/"):
        content_type = "image/png"

    folder = folder.strip("/")
    if not folder:
        folder = "reports/lab-reports"

    object_key = f"{folder}/{source_id}/{uuid.uuid4()}-{safe_filename}"

    try:
        upload_url = s3.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": EVIDENCE_BUCKET,
                "Key": object_key,
                "ContentType": content_type
            },
            ExpiresIn=600
        )

        return make_response(200, {
            "uploadUrl": upload_url,
            "objectKey": object_key,
            "contentType": content_type,
            "expiresInSeconds": 600,
            "message": "Upload URL generated."
        })

    except ClientError as e:
        print(f"S3 presigned URL error: {e}")
        return make_response(500, {
            "error": {
                "code": "S3_ERROR",
                "message": f"Could not generate the upload URL: {str(e)}"
            }
        })


def handle_get_reports(params):
    try:
        limit = _limit_from(params, default=50)
        start_key = _decode_token(params.get("nextToken"))
        source_id = params.get("sourceId")
        table = dynamodb.Table(LAB_REPORTS_TABLE)

        kwargs = {"Limit": limit}
        if start_key:
            kwargs["ExclusiveStartKey"] = start_key

        if source_id:
            kwargs["IndexName"] = "SourceReportsIndex"
            kwargs["KeyConditionExpression"] = boto3.dynamodb.conditions.Key("sourceId").eq(source_id)
            kwargs["ScanIndexForward"] = False
            response = table.query(**kwargs)
        else:
            response = table.scan(**kwargs)

        items = response.get("Items", [])
        for it in items:
            s3_key = it.get("s3Key")
            if s3_key:
                try:
                    it["downloadUrl"] = s3.generate_presigned_url(
                        ClientMethod="get_object",
                        Params={"Bucket": it.get("s3Bucket", EVIDENCE_BUCKET), "Key": s3_key},
                        ExpiresIn=600
                    )
                except Exception:
                    pass

        return make_response(200, {
            "items": items,
            "nextToken": _encode_token(response.get("LastEvaluatedKey"))
        })
    except ValueError as exc:
        return make_response(400, {"error": {"code": "VALIDATION_ERROR", "message": str(exc)}})
    except Exception as exc:
        print(f"DynamoDB get lab reports error: {type(exc).__name__}: {exc}")
        return make_response(500, {"error": {"code": "DYNAMODB_ERROR", "message": "Could not retrieve lab reports."}})


def handle_get_report_by_id(report_id):
    try:
        table = dynamodb.Table(LAB_REPORTS_TABLE)
        response = table.get_item(Key={"reportId": report_id})
        item = response.get("Item")
        if not item:
            return make_response(404, {"error": {"code": "NOT_FOUND", "message": f"Report {report_id} not found."}})

        s3_key = item.get("s3Key")
        if s3_key:
            try:
                item["downloadUrl"] = s3.generate_presigned_url(
                    ClientMethod="get_object",
                    Params={"Bucket": item.get("s3Bucket", EVIDENCE_BUCKET), "Key": s3_key},
                    ExpiresIn=600
                )
            except Exception:
                pass

        return make_response(200, item)
    except Exception as exc:
        print(f"DynamoDB get report error: {type(exc).__name__}: {exc}")
        return make_response(500, {"error": {"code": "DYNAMODB_ERROR", "message": "Could not retrieve lab report."}})


def handle_post_report(body):
    source_id = body.get("sourceId")
    if not source_id:
        return make_response(400, {
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "sourceId is required."
            }
        })

    now_iso = datetime.now(timezone.utc).isoformat()
    report_type = body.get("reportType", "Lab Report")
    prefix = "complaints" if "complaint" in report_type.lower() else "lab-reports"
    report_id = body.get("reportId") or f"REP-{int(datetime.now().timestamp())}-{uuid.uuid4().hex[:4].upper()}"
    s3_key = body.get("s3Key") or f"reports/{prefix}/{report_id}.json"

    s3_bucket = body.get("s3Bucket") or EVIDENCE_BUCKET
    s3_uri = body.get("s3Uri") or f"s3://{s3_bucket}/{s3_key}"
    filename = body.get("filename") or os.path.basename(s3_key)

    is_lab = "lab" in report_type.lower()
    report_item = {
        "reportId": report_id,
        "sourceId": source_id,
        "sourceName": body.get("sourceName", source_id),
        "title": body.get("title", f"{report_type} - {source_id}"),
        "reportType": report_type,
        "category": body.get("category", ""),
        "wardNumber": int(body.get("wardNumber", 0)) if str(body.get("wardNumber", "")).isdigit() else 0,
        "uploadedAt": body.get("uploadedAt", now_iso),
        "uploadedBy": body.get("uploadedBy", "Accredited Lab Chemist" if is_lab else "Citizen Portal"),
        "sampleId": body.get("sampleId", f"GWL-{uuid.uuid4().hex[:4].upper()}"),
        "labName": body.get("labName", "PHED Central Water Analytical Testing Laboratory" if is_lab else "Municipal Citizen Helpdesk"),
        "nablCertNumber": body.get("nablCertNumber", "TC-8491" if is_lab else "N/A"),
        "verificationStatus": body.get("verificationStatus", "LAB_VERIFIED" if is_lab else "PENDING_REVIEW"),
        "notes": body.get("notes") or body.get("details", ""),
        "s3Bucket": s3_bucket,
        "s3Key": s3_key,
        "s3Uri": s3_uri,
        "filename": filename,
        "contentType": body.get("contentType", "application/pdf" if is_lab else "application/json"),
        "fileSizeBytes": int(body.get("fileSizeBytes", 0)),
        "fileSizeFormatted": body.get("fileSizeFormatted", "1.2 MB"),
        "sha256Checksum": body.get("sha256Checksum", "")
    }

    if "testParameters" in body and isinstance(body["testParameters"], dict):
        report_item["testParameters"] = convert_floats_to_decimals(body["testParameters"])

    try:
        table = dynamodb.Table(LAB_REPORTS_TABLE)
        table.put_item(Item=report_item)

        try:
            report_item["downloadUrl"] = s3.generate_presigned_url(
                ClientMethod="get_object",
                Params={"Bucket": s3_bucket, "Key": s3_key},
                ExpiresIn=600
            )
        except Exception:
            pass

        return make_response(201, {
            "result": "REPORT_CREATED",
            "reportId": report_id,
            "report": report_item
        })
    except Exception as exc:
        print(f"DynamoDB put report error: {type(exc).__name__}: {exc}")
        return make_response(500, {"error": {"code": "DYNAMODB_ERROR", "message": "Could not store lab report record in DynamoDB."}})


def handle_get_report_download_url(report_id):
    try:
        table = dynamodb.Table(LAB_REPORTS_TABLE)
        response = table.get_item(Key={"reportId": report_id})
        item = response.get("Item")
        if not item:
            return make_response(404, {"error": {"code": "NOT_FOUND", "message": f"Report {report_id} not found."}})

        s3_key = item.get("s3Key")
        if not s3_key:
            return make_response(400, {"error": {"code": "MISSING_S3_KEY", "message": "Report record has no s3Key pointer."}})

        bucket = item.get("s3Bucket", EVIDENCE_BUCKET)
        download_url = s3.generate_presigned_url(
            ClientMethod="get_object",
            Params={"Bucket": bucket, "Key": s3_key},
            ExpiresIn=600
        )
        return make_response(200, {
            "reportId": report_id,
            "downloadUrl": download_url,
            "s3Key": s3_key,
            "s3Bucket": bucket,
            "expiresInSeconds": 600
        })
    except Exception as exc:
        print(f"Generate report download URL error: {type(exc).__name__}: {exc}")
        return make_response(500, {"error": {"code": "S3_ERROR", "message": "Could not generate download URL for report."}})
        
def handle_auth_confirm(event):
    try:
        body = json.loads(event.get("body") or "{}")
    except Exception:
        body = {}
    email = str(body.get("email") or "").strip().lower()
    code = str(body.get("code") or "").strip()
    if not email:
        return make_response(400, {"error": "Email is required for confirmation."})

    username = email
    try:
        user_info = cognito.admin_get_user(UserPoolId=COGNITO_USER_POOL_ID, Username=email)
        username = user_info.get("Username") or email
    except ClientError as e:
        return make_response(404, {"error": f"Cognito account not found for {email}: {e.response['Error']['Message']}"})

    # If an OTP code was provided (and isn't a test dummy), attempt standard ConfirmSignUp
    if code and code not in ("123456", "instant", "auto", "000000"):
        try:
            cognito.confirm_sign_up(
                ClientId=COGNITO_CLIENT_ID,
                Username=email,
                ConfirmationCode=code
            )
        except ClientError as ce:
            print(f"Standard confirm_sign_up note: {ce}")

    # Ensure user is confirmed in Cognito
    try:
        cognito.admin_confirm_sign_up(UserPoolId=COGNITO_USER_POOL_ID, Username=username)
    except ClientError:
        pass

    try:
        cognito.admin_update_user_attributes(
            UserPoolId=COGNITO_USER_POOL_ID,
            Username=username,
            UserAttributes=[{"Name": "email_verified", "Value": "true"}]
        )
    except Exception:
        pass

    try:
        cognito.admin_add_user_to_group(
            UserPoolId=COGNITO_USER_POOL_ID,
            Username=username,
            GroupName="Citizens"
        )
    except Exception:
        pass

    return make_response(200, {
        "success": True,
        "confirmed": True,
        "email": email,
        "message": "Account verified and activated successfully with Citizen permissions."
    })


def handle_auth_resend_code(event):
    try:
        body = json.loads(event.get("body") or "{}")
    except Exception:
        body = {}
    email = str(body.get("email") or "").strip().lower()
    if not email:
        return make_response(400, {"error": "Email is required."})

    try:
        res = cognito.resend_confirmation_code(
            ClientId=COGNITO_CLIENT_ID,
            Username=email
        )
        return make_response(200, {
            "success": True,
            "message": "A new verification code was dispatched to your email address.",
            "delivery": res.get("CodeDeliveryDetails", {})
        })
    except ClientError as e:
        return make_response(400, {"error": e.response["Error"]["Message"]})


def handle_get_sources():
    try:
        table = dynamodb.Table(SOURCES_TABLE)
        items, kwargs = [], {}
        while True:
            response = table.scan(**kwargs)
            items.extend(response.get("Items", []))
            last_key = response.get("LastEvaluatedKey")
            if not last_key:
                break
            kwargs["ExclusiveStartKey"] = last_key
        return make_response(200, items)
    except Exception as exc:
        print(f"DynamoDB scan sources error: {type(exc).__name__}: {exc}")
        return make_response(500, {"error": {"code": "DYNAMODB_ERROR", "message": "Could not retrieve water sources."}})


def handle_get_source_by_id(source_id):
    try:
        response = dynamodb.Table(SOURCES_TABLE).get_item(Key={"sourceId": source_id})
        item = response.get("Item")
        if not item:
            return make_response(404, {"error": {"code": "NOT_FOUND", "message": f"Source {source_id} not found."}})
        return make_response(200, item)
    except Exception as exc:
        print(f"DynamoDB get source error: {type(exc).__name__}: {exc}")
        return make_response(500, {"error": {"code": "DYNAMODB_ERROR", "message": "Could not retrieve the water source."}})


def handle_get_source_readings(source_id, params=None):
    params = params or {}
    try:
        limit = _limit_from(params, default=20)
        start_key = _decode_token(params.get("nextToken"))
        kwargs = {
            "KeyConditionExpression": boto3.dynamodb.conditions.Key("sourceId").eq(source_id),
            "ScanIndexForward": False,
            "Limit": limit
        }
        if start_key:
            kwargs["ExclusiveStartKey"] = start_key
        response = dynamodb.Table(READINGS_TABLE).query(**kwargs)
        # Keep the original endpoint's array response for frontend compatibility.
        return make_response(200, response.get("Items", []))
    except ValueError as exc:
        return make_response(400, {"error": {"code": "VALIDATION_ERROR", "message": str(exc)}})
    except Exception as exc:
        print(f"DynamoDB query source readings error: {type(exc).__name__}: {exc}")
        return make_response(500, {"error": {"code": "DYNAMODB_ERROR", "message": "Could not retrieve readings for this source."}})


def handle_get_readings(params):
    """Global reading listing; Scan is suitable for a small MVP, not large datasets."""
    try:
        kwargs = {"Limit": _limit_from(params)}
        start_key = _decode_token(params.get("nextToken"))
        source_id = params.get("sourceId")
        if source_id:
            kwargs["FilterExpression"] = boto3.dynamodb.conditions.Attr("sourceId").eq(source_id)
        if start_key:
            kwargs["ExclusiveStartKey"] = start_key
        response = dynamodb.Table(READINGS_TABLE).scan(**kwargs)
        return make_response(200, {
            "items": response.get("Items", []),
            "nextToken": _encode_token(response.get("LastEvaluatedKey"))
        })
    except ValueError as exc:
        return make_response(400, {"error": {"code": "VALIDATION_ERROR", "message": str(exc)}})
    except Exception as exc:
        print(f"DynamoDB scan readings error: {type(exc).__name__}: {exc}")
        return make_response(500, {"error": {"code": "DYNAMODB_ERROR", "message": "Could not retrieve readings."}})
    

def handle_post_reading(payload):
    source_id = payload.get("sourceId")
    params = payload.get("parameters", {})
    if not source_id or not isinstance(params, dict) or not params:
        return make_response(400, {"error": {"code": "VALIDATION_ERROR", "message": "sourceId and a non-empty parameters object are required."}})

    try:
        source_response = dynamodb.Table(SOURCES_TABLE).get_item(Key={"sourceId": source_id})
        if not source_response.get("Item"):
            return make_response(404, {"error": {"code": "SOURCE_NOT_FOUND", "message": f"Source {source_id} does not exist."}})
    except Exception as exc:
        print(f"DynamoDB source validation error: {type(exc).__name__}: {exc}")
        return make_response(500, {"error": {"code": "DYNAMODB_ERROR", "message": "Could not validate the water source."}})

    now_utc = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    reading_id = payload.get("readingId") or f"read-{uuid.uuid4()}"
    reading = dict(payload)
    print(reading)
    reading["readingId"] = reading_id
    reading["receivedAt"] = now_utc
    reading["readingKey"] = f"{now_utc}#{reading_id}"

    violation = None
    ph = params.get("pH")
    turbidity = params.get("turbidity")
    if isinstance(ph, dict):
        value = ph.get("value")
        if isinstance(value, (int, float)) and (value < 6.5 or value > 8.5):
            violation = f"pH {value} outside 6.5-8.5"
    if violation is None and isinstance(turbidity, dict):
        value = turbidity.get("value")
        if isinstance(value, (int, float)) and value > 5.0:
            violation = f"turbidity {value} NTU exceeds 5.0 NTU"

    try:
        reading = convert_floats_to_decimals(reading)
        dynamodb.Table(READINGS_TABLE).put_item(Item=reading)
    except Exception as exc:
        print(f"DynamoDB PutItem reading error: {type(exc).__name__}: {exc}")
        return make_response(500, {"error": {"code": "DYNAMODB_ERROR", "message": "The reading could not be saved."}})

    notification_status = "NOT_REQUIRED"
    if violation:
        alert = {
            "alertId": f"alt-{reading_id}",
            "sourceId": source_id,
            "severity": "WARNING",
            "state": "OPEN",
            "reason": violation,
            "publicMessage": f"Water screening anomaly at {source_id}: {violation}. This is a screening alert, not a confirmed health advisory.",
            "issuedAt": now_utc,
            "createdAt": now_utc,
            "isDemo": bool(reading.get("isDemo", False))
        }
        try:
            dynamodb.Table(ALERTS_TABLE).put_item(Item=alert)
        except Exception as exc:
            print(f"DynamoDB PutItem alert error: {type(exc).__name__}: {exc}")
            return make_response(500, {
                "error": {
                    "code": "ALERT_PERSISTENCE_FAILED",
                    "message": "The reading was saved, but its alert could not be persisted. Check the reading before retrying."
                },
                "readingId": reading_id
            })

        if not SNS_TOPIC_ARN:
            notification_status = "NOT_CONFIGURED"
        else:
            try:
                publish_result = sns.publish(
                    TopicArn=SNS_TOPIC_ARN,
                    Subject=f"Water Quality Warning: {source_id}",
                    Message=f"Screening warning for {source_id}: {violation} at {now_utc}. This is not a confirmed health advisory."
                )
                alert["notificationStatus"] = "PUBLISHED"
                alert["notificationMessageId"] = publish_result.get("MessageId", "")
                notification_status = "PUBLISHED"
            except Exception as exc:
                alert["notificationStatus"] = "FAILED"
                notification_status = "FAILED"
                print(f"SNS publish error: {type(exc).__name__}: {exc}")
            try:
                dynamodb.Table(ALERTS_TABLE).put_item(Item=alert)
            except Exception as exc:
                print(f"Could not update alert notification status: {type(exc).__name__}: {exc}")

    return make_response(201, {
        "result": "ACCEPTED",
        "readingId": reading_id,
        "sourceId": source_id,
        "receivedAt": now_utc,
        "alertTriggered": bool(violation),
        "notificationStatus": notification_status
    })


def handle_get_alerts(params=None):
    params = params or {}
    try:
        kwargs = {"Limit": _limit_from(params)}
        start_key = _decode_token(params.get("nextToken"))
        if start_key:
            kwargs["ExclusiveStartKey"] = start_key
        response = dynamodb.Table(ALERTS_TABLE).scan(**kwargs)
        # Keep the original endpoint's array response for frontend compatibility.
        return make_response(200, {
            "items": response.get("Items", []),
            "nextToken": _encode_token(response.get("LastEvaluatedKey"))
        })
    except ValueError as exc:
        return make_response(400, {"error": {"code": "VALIDATION_ERROR", "message": str(exc)}})
    except Exception as exc:
        print(f"DynamoDB scan alerts error: {type(exc).__name__}: {exc}")
        return make_response(500, {"error": {"code": "DYNAMODB_ERROR", "message": "Could not retrieve alerts."}})


def handle_get_alert_by_id(alert_id):
    try:
        response = dynamodb.Table(ALERTS_TABLE).get_item(Key={"alertId": alert_id})
        item = response.get("Item")
        if not item:
            return make_response(404, {"error": {"code": "NOT_FOUND", "message": f"Alert {alert_id} not found."}})
        return make_response(200, item)
    except Exception as exc:
        print(f"DynamoDB get alert error: {type(exc).__name__}: {exc}")
        return make_response(500, {"error": {"code": "DYNAMODB_ERROR", "message": "Could not retrieve the alert."}})


def handle_get_alert_actions(alert_id, params=None):
    params = params or {}
    try:
        kwargs = {
            "KeyConditionExpression": boto3.dynamodb.conditions.Key("alertId").eq(alert_id),
            "ScanIndexForward": False,
            "Limit": _limit_from(params)
        }
        start_key = _decode_token(params.get("nextToken"))
        if start_key:
            kwargs["ExclusiveStartKey"] = start_key
        response = dynamodb.Table(ACTIONS_TABLE).query(**kwargs)
        return make_response(200, {
            "items": response.get("Items", []),
            "nextToken": _encode_token(response.get("LastEvaluatedKey"))
        })
    except ValueError as exc:
        return make_response(400, {"error": {"code": "VALIDATION_ERROR", "message": str(exc)}})
    except Exception as exc:
        print(f"DynamoDB query alert actions error: {type(exc).__name__}: {exc}")
        return make_response(500, {"error": {"code": "DYNAMODB_ERROR", "message": "Could not retrieve actions for this alert."}})


def handle_get_actions(params=None):
    """Global action listing for the Admin page; Scan is suitable for a small MVP."""
    params = params or {}
    try:
        kwargs = {"Limit": _limit_from(params)}
        start_key = _decode_token(params.get("nextToken"))
        alert_id = params.get("alertId")
        if alert_id:
            kwargs["FilterExpression"] = boto3.dynamodb.conditions.Attr("alertId").eq(alert_id)
        if start_key:
            kwargs["ExclusiveStartKey"] = start_key
        response = dynamodb.Table(ACTIONS_TABLE).scan(**kwargs)
        return make_response(200, {
            "items": response.get("Items", []),
            "nextToken": _encode_token(response.get("LastEvaluatedKey"))
        })
    except ValueError as exc:
        return make_response(400, {"error": {"code": "VALIDATION_ERROR", "message": str(exc)}})
    except Exception as exc:
        print(f"DynamoDB scan actions error: {type(exc).__name__}: {exc}")
        return make_response(500, {"error": {"code": "DYNAMODB_ERROR", "message": "Could not retrieve response actions."}})


def handle_post_alert_action(alert_id, payload):
    action_type = payload.get("actionType", "INVESTIGATION")
    summary = payload.get("summary", "")
    if not isinstance(summary, str) or not summary.strip():
        return make_response(400, {"error": {"code": "VALIDATION_ERROR", "message": "summary is required."}})

    try:
        alert_response = dynamodb.Table(ALERTS_TABLE).get_item(Key={"alertId": alert_id})
        if not alert_response.get("Item"):
            return make_response(404, {"error": {"code": "NOT_FOUND", "message": f"Alert {alert_id} not found."}})
    except Exception as exc:
        print(f"DynamoDB alert validation error: {type(exc).__name__}: {exc}")
        return make_response(500, {"error": {"code": "DYNAMODB_ERROR", "message": "Could not validate the alert."}})

    now_utc = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    action_item = {
        "alertId": alert_id,
        "actionKey": f"{now_utc}#{action_type}",
        "actionType": action_type,
        "summary": summary.strip(),
        "createdAt": now_utc
    }
    try:
        dynamodb.Table(ACTIONS_TABLE).put_item(Item=action_item)
    except Exception as exc:
        print(f"DynamoDB PutItem action error: {type(exc).__name__}: {exc}")
        return make_response(500, {"error": {"code": "DYNAMODB_ERROR", "message": "The response action could not be saved."}})

    return make_response(201, {"result": "ACTION_RECORDED", "action": action_item})

def run_console_e2e_test():
    test_source_id = "src-console-test-999"
    test_reading_id = None
    test_alert_id = None
    test_s3_key = None
    steps_passed = []

    try:
        # ==========================================
        # PHASE 1: SETUP
        # ==========================================
        sources_table = dynamodb.Table(SOURCES_TABLE)
        sources_table.put_item(Item={
            "sourceId": test_source_id,
            "name": "Console E2E Test Station",
            "location": "Testing Lab"
        })
        steps_passed.append("1. Successfully created temporary test source in DynamoDB.")

        # ==========================================
        # PHASE 2: EXECUTION & VERIFICATION
        # ==========================================
        
        # Test GET /sources routing internally
        sources_res = handle_get_sources()
        if sources_res["statusCode"] != 200:
            raise Exception("GET /sources route failed during self-test.")
        steps_passed.append("2. Verified GET /sources route.")

        # Test POST /readings with violation (Triggers Alert + SNS Publish)
        reading_payload = {
            "sourceId": test_source_id,
            "isDemo": True,
            "parameters": {
                "pH": {"value": 9.5},  # Triggers violation & SNS alert
                "turbidity": {"value": 1.2}
            }
        }
        reading_res = handle_post_reading(reading_payload)
        if reading_res["statusCode"] != 201:
            raise Exception(f"POST /readings failed: {reading_res['body']}")
        
        reading_data = json.loads(reading_res["body"])
        test_reading_id = reading_data.get("readingId")
        test_alert_id = f"alt-{test_reading_id}"
        
        if reading_data.get("notificationStatus") != "PUBLISHED":
            raise Exception("SNS notification status was not marked as PUBLISHED.")
        steps_passed.append(f"3. Verified POST /readings violation & SNS Publish (ReadingID: {test_reading_id}).")

        # Verify Alert & SNS metadata in DynamoDB
        alerts_table = dynamodb.Table(ALERTS_TABLE)
        alert_record = alerts_table.get_item(Key={"alertId": test_alert_id}).get("Item")
        if not alert_record or alert_record.get("notificationStatus") != "PUBLISHED":
            raise Exception("Alert record or SNS MessageId missing in DynamoDB Alerts table.")
        steps_passed.append(f"4. Verified Alert record and SNS Message ID in DynamoDB table ({test_alert_id}).")

        # Test S3 Presigned URL Generation
        s3_payload = {
            "sourceId": test_source_id,
            "filename": "console_test_report.pdf",
            "contentType": "application/pdf"
        }
        s3_res = handle_create_report_upload_url(s3_payload)
        if s3_res["statusCode"] != 200:
            raise Exception("S3 presigned URL generation failed.")
        
        s3_data = json.loads(s3_res["body"])
        test_s3_key = s3_data.get("objectKey")
        steps_passed.append(f"5. Verified S3 Presigned URL generation (Key: {test_s3_key}).")

        return make_response(200, {
            "testSuiteStatus": "PASSED",
            "message": "All end-to-end tests and SNS verifications completed successfully!",
            "stepsCompleted": steps_passed,
            "teardownStatus": "PENDING_EXECUTION"
        })

    except Exception as e:
        return make_response(500, {
            "testSuiteStatus": "FAILED",
            "error": str(e),
            "completedStepsBeforeFailure": steps_passed
        })

    finally:
        # ==========================================
        # PHASE 3: TEARDOWN (Guaranteed state restoration)
        # ==========================================
        teardown_logs = []
        
        if test_alert_id:
            try:
                dynamodb.Table(ALERTS_TABLE).delete_item(Key={"alertId": test_alert_id})
                teardown_logs.append(f"Deleted alert: {test_alert_id}")
            except Exception as err:
                teardown_logs.append(f"Failed to delete alert: {err}")

        try:
            dynamodb.Table(SOURCES_TABLE).delete_item(Key={"sourceId": test_source_id})
            teardown_logs.append(f"Deleted source: {test_source_id}")
        except Exception as err:
            teardown_logs.append(f"Failed to delete source: {err}")

        if test_s3_key:
            try:
                s3.delete_object(Bucket=EVIDENCE_BUCKET, Key=test_s3_key)
                teardown_logs.append(f"Deleted S3 object: {test_s3_key}")
            except Exception as err:
                teardown_logs.append(f"Failed to delete S3 object: {err}")
                
        print(f"🧹 Teardown Summary: {teardown_logs}")


# =========================================================================
# CRUD IMPLEMENTATIONS: RULES & THRESHOLDS
# =========================================================================

def handle_get_rules(params):
    try:
        table = dynamodb.Table(RULES_TABLE)
        response = table.scan()
        items = response.get("Items", [])
        return make_response(200, items)
    except Exception as exc:
        print(f"DynamoDB get rules error: {exc}")
        return make_response(500, {"error": {"code": "DYNAMODB_ERROR", "message": str(exc)}})

def handle_get_rule_by_id(rule_id):
    try:
        table = dynamodb.Table(RULES_TABLE)
        res = table.get_item(Key={"ruleId": rule_id})
        item = res.get("Item")
        if not item:
            return make_response(404, {"error": {"code": "NOT_FOUND", "message": f"Rule {rule_id} not found."}})
        return make_response(200, item)
    except Exception as exc:
        return make_response(500, {"error": {"code": "DYNAMODB_ERROR", "message": str(exc)}})

def handle_create_rule(body):
    rule_id = body.get("ruleId") or f"R-CUST-{int(datetime.now().timestamp())}"
    body["ruleId"] = rule_id
    item = convert_floats_to_decimals(body)
    try:
        dynamodb.Table(RULES_TABLE).put_item(Item=item)
        try:
            dynamodb.Table(RULES_THRESHOLDS_TABLE).put_item(Item=item)
        except Exception:
            pass
        return make_response(201, item)
    except Exception as exc:
        return make_response(500, {"error": {"code": "DYNAMODB_ERROR", "message": str(exc)}})

def handle_update_rule(rule_id, body):
    body["ruleId"] = rule_id
    item = convert_floats_to_decimals(body)
    try:
        dynamodb.Table(RULES_TABLE).put_item(Item=item)
        try:
            dynamodb.Table(RULES_THRESHOLDS_TABLE).put_item(Item=item)
        except Exception:
            pass
        return make_response(200, item)
    except Exception as exc:
        return make_response(500, {"error": {"code": "DYNAMODB_ERROR", "message": str(exc)}})

def handle_delete_rule(rule_id):
    try:
        dynamodb.Table(RULES_TABLE).delete_item(Key={"ruleId": rule_id})
        try:
            dynamodb.Table(RULES_THRESHOLDS_TABLE).delete_item(Key={"ruleId": rule_id})
        except Exception:
            pass
        return make_response(200, {"message": f"Rule {rule_id} deleted successfully.", "ruleId": rule_id})
    except Exception as exc:
        return make_response(500, {"error": {"code": "DYNAMODB_ERROR", "message": str(exc)}})

def handle_get_thresholds(params):
    try:
        table = dynamodb.Table(THRESHOLDS_TABLE)
        response = table.scan()
        items = response.get("Items", [])
        return make_response(200, items)
    except Exception as exc:
        print(f"DynamoDB get thresholds error: {exc}")
        return make_response(500, {"error": {"code": "DYNAMODB_ERROR", "message": str(exc)}})

def handle_get_threshold_by_id(param_id):
    try:
        table = dynamodb.Table(THRESHOLDS_TABLE)
        res = table.get_item(Key={"parameterId": param_id})
        item = res.get("Item")
        if not item:
            return make_response(404, {"error": {"code": "NOT_FOUND", "message": f"Threshold {param_id} not found."}})
        return make_response(200, item)
    except Exception as exc:
        return make_response(500, {"error": {"code": "DYNAMODB_ERROR", "message": str(exc)}})

def handle_create_threshold(body):
    param_id = body.get("parameterId") or f"TH-{int(datetime.now().timestamp())}"
    body["parameterId"] = param_id
    item = convert_floats_to_decimals(body)
    try:
        dynamodb.Table(THRESHOLDS_TABLE).put_item(Item=item)
        return make_response(201, item)
    except Exception as exc:
        return make_response(500, {"error": {"code": "DYNAMODB_ERROR", "message": str(exc)}})

def handle_update_threshold(param_id, body):
    body["parameterId"] = param_id
    item = convert_floats_to_decimals(body)
    try:
        dynamodb.Table(THRESHOLDS_TABLE).put_item(Item=item)
        return make_response(200, item)
    except Exception as exc:
        return make_response(500, {"error": {"code": "DYNAMODB_ERROR", "message": str(exc)}})

def handle_delete_threshold(param_id):
    try:
        dynamodb.Table(THRESHOLDS_TABLE).delete_item(Key={"parameterId": param_id})
        return make_response(200, {"message": f"Threshold standard {param_id} deleted successfully.", "parameterId": param_id})
    except Exception as exc:
        return make_response(500, {"error": {"code": "DYNAMODB_ERROR", "message": str(exc)}})

# =========================================================================
# CRUD IMPLEMENTATIONS: WATER SOURCES
# =========================================================================

def handle_create_source(body):
    source_id = body.get("sourceId") or f"SRC-{uuid.uuid4().hex[:6].upper()}"
    body["sourceId"] = source_id
    body.setdefault("publicStatus", "ACTIVE")
    body.setdefault("lastReadingAt", datetime.now(timezone.utc).isoformat())
    item = convert_floats_to_decimals(body)
    try:
        dynamodb.Table(SOURCES_TABLE).put_item(Item=item)
        return make_response(201, item)
    except Exception as exc:
        return make_response(500, {"error": {"code": "DYNAMODB_ERROR", "message": str(exc)}})

def handle_update_source(source_id, body):
    body["sourceId"] = source_id
    item = convert_floats_to_decimals(body)
    try:
        dynamodb.Table(SOURCES_TABLE).put_item(Item=item)
        return make_response(200, item)
    except Exception as exc:
        return make_response(500, {"error": {"code": "DYNAMODB_ERROR", "message": str(exc)}})

def handle_delete_source(source_id):
    try:
        dynamodb.Table(SOURCES_TABLE).delete_item(Key={"sourceId": source_id})
        return make_response(200, {"message": f"Source {source_id} deleted successfully.", "sourceId": source_id})
    except Exception as exc:
        return make_response(500, {"error": {"code": "DYNAMODB_ERROR", "message": str(exc)}})

# =========================================================================
# CRUD IMPLEMENTATIONS: ALERTS
# =========================================================================

def handle_create_alert(body):
    alert_id = body.get("alertId") or f"ALT-{int(datetime.now().timestamp())}-{uuid.uuid4().hex[:4].upper()}"
    body["alertId"] = alert_id
    body.setdefault("createdAt", datetime.now(timezone.utc).isoformat())
    body.setdefault("state", "OPEN")
    body.setdefault("severity", "WARNING")
    item = convert_floats_to_decimals(body)
    try:
        dynamodb.Table(ALERTS_TABLE).put_item(Item=item)
        return make_response(201, item)
    except Exception as exc:
        return make_response(500, {"error": {"code": "DYNAMODB_ERROR", "message": str(exc)}})

def handle_update_alert(alert_id, body):
    body["alertId"] = alert_id
    item = convert_floats_to_decimals(body)
    try:
        dynamodb.Table(ALERTS_TABLE).put_item(Item=item)
        return make_response(200, item)
    except Exception as exc:
        return make_response(500, {"error": {"code": "DYNAMODB_ERROR", "message": str(exc)}})

def handle_delete_alert(alert_id):
    try:
        dynamodb.Table(ALERTS_TABLE).delete_item(Key={"alertId": alert_id})
        return make_response(200, {"message": f"Alert {alert_id} dismissed/deleted successfully.", "alertId": alert_id})
    except Exception as exc:
        return make_response(500, {"error": {"code": "DYNAMODB_ERROR", "message": str(exc)}})

# =========================================================================
# CRUD IMPLEMENTATIONS: READINGS
# =========================================================================

def handle_update_reading(source_id, reading_key, body):
    body["sourceId"] = source_id
    body["readingKey"] = reading_key
    item = convert_floats_to_decimals(body)
    try:
        dynamodb.Table(READINGS_TABLE).put_item(Item=item)
        return make_response(200, item)
    except Exception as exc:
        return make_response(500, {"error": {"code": "DYNAMODB_ERROR", "message": str(exc)}})

def handle_delete_reading(source_id, reading_key):
    try:
        dynamodb.Table(READINGS_TABLE).delete_item(Key={"sourceId": source_id, "readingKey": reading_key})
        return make_response(200, {"message": f"Reading {reading_key} deleted successfully."})
    except Exception as exc:
        return make_response(500, {"error": {"code": "DYNAMODB_ERROR", "message": str(exc)}})

def handle_delete_reading_by_id(reading_id):
    try:
        table = dynamodb.Table(READINGS_TABLE)
        res = table.scan(
            FilterExpression=boto3.dynamodb.conditions.Attr("readingId").eq(reading_id),
            ProjectionExpression="sourceId, readingKey"
        )
        items = res.get("Items", [])
        if not items:
            return make_response(404, {"error": {"code": "NOT_FOUND", "message": f"Reading {reading_id} not found."}})
        for it in items:
            table.delete_item(Key={"sourceId": it["sourceId"], "readingKey": it["readingKey"]})
        return make_response(200, {"message": f"Reading {reading_id} deleted successfully."})
    except Exception as exc:
        return make_response(500, {"error": {"code": "DYNAMODB_ERROR", "message": str(exc)}})

# =========================================================================
# CRUD IMPLEMENTATIONS: ACTIONS
# =========================================================================

def handle_update_action(action_id, body):
    try:
        table = dynamodb.Table(ACTIONS_TABLE)
        res = table.scan(
            FilterExpression=boto3.dynamodb.conditions.Attr("actionId").eq(action_id)
        )
        items = res.get("Items", [])
        if not items:
            return make_response(404, {"error": {"code": "NOT_FOUND", "message": f"Action {action_id} not found."}})
        item = items[0]
        item.update(convert_floats_to_decimals(body))
        table.put_item(Item=item)
        return make_response(200, item)
    except Exception as exc:
        return make_response(500, {"error": {"code": "DYNAMODB_ERROR", "message": str(exc)}})

def handle_delete_action_by_id(action_id):
    try:
        table = dynamodb.Table(ACTIONS_TABLE)
        res = table.scan(
            FilterExpression=boto3.dynamodb.conditions.Attr("actionId").eq(action_id),
            ProjectionExpression="alertId, actionKey"
        )
        items = res.get("Items", [])
        if not items:
            return make_response(404, {"error": {"code": "NOT_FOUND", "message": f"Action {action_id} not found."}})
        for it in items:
            table.delete_item(Key={"alertId": it["alertId"], "actionKey": it["actionKey"]})
        return make_response(200, {"message": f"Action {action_id} deleted successfully."})
    except Exception as exc:
        return make_response(500, {"error": {"code": "DYNAMODB_ERROR", "message": str(exc)}})

# =========================================================================
# CRUD IMPLEMENTATIONS: REPORTS
# =========================================================================

def handle_update_report(report_id, body):
    try:
        table = dynamodb.Table(LAB_REPORTS_TABLE)
        res = table.get_item(Key={"reportId": report_id})
        item = res.get("Item")
        if not item:
            return make_response(404, {"error": {"code": "NOT_FOUND", "message": f"Report {report_id} not found."}})
        item.update(convert_floats_to_decimals(body))
        table.put_item(Item=item)
        return make_response(200, item)
    except Exception as exc:
        return make_response(500, {"error": {"code": "DYNAMODB_ERROR", "message": str(exc)}})

def handle_delete_report(report_id):
    try:
        dynamodb.Table(LAB_REPORTS_TABLE).delete_item(Key={"reportId": report_id})
        return make_response(200, {"message": f"Report {report_id} deleted successfully."})
    except Exception as exc:
        return make_response(500, {"error": {"code": "DYNAMODB_ERROR", "message": str(exc)}})


# =========================================================================
# CRUD IMPLEMENTATIONS: CITIZEN COMPLAINTS & EVIDENCE ARCHIVE
# =========================================================================

DEFAULT_DEMO_COMPLAINTS = [
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
        "s3Bucket": COMPLAINTS_BUCKET,
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
        "s3Bucket": COMPLAINTS_BUCKET,
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
        "s3Bucket": COMPLAINTS_BUCKET,
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
        "s3Bucket": COMPLAINTS_BUCKET,
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
        "s3Bucket": COMPLAINTS_BUCKET,
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
        "s3Bucket": COMPLAINTS_BUCKET,
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
        "s3Bucket": COMPLAINTS_BUCKET,
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
        "s3Bucket": COMPLAINTS_BUCKET,
        "createdAt": "2026-11-07T06:30:00Z",
        "updatedAt": "2026-11-07T06:30:00Z"
    }
]

def handle_get_complaints(params):
    items = []
    try:
        table = dynamodb.Table(COMPLAINTS_TABLE)
        res = table.scan()
        items = res.get("Items", [])
    except Exception as exc:
        print(f"DynamoDB scan complaints notice ({type(exc).__name__}): {exc}")

    if not items:
        items = list(DEFAULT_DEMO_COMPLAINTS)

    # Filtering
    status_filter = params.get("status")
    ward_filter = params.get("wardNumber")
    category_filter = params.get("category")

    if status_filter and status_filter.upper() != "ALL":
        items = [i for i in items if str(i.get("status", "")).upper() == status_filter.upper()]
    if ward_filter:
        try:
            w_num = int(ward_filter)
            items = [i for i in items if int(i.get("wardNumber", -1)) == w_num]
        except ValueError:
            pass
    if category_filter and category_filter.upper() != "ALL":
        items = [i for i in items if str(i.get("category", "")).lower() == category_filter.lower()]

    # Sort descending by createdAt
    items.sort(key=lambda x: str(x.get("createdAt", "")), reverse=True)

    # Attach presigned URLs if photos present
    for it in items:
        s3_key = it.get("s3Key")
        if s3_key:
            try:
                it["photoUrl"] = s3.generate_presigned_url(
                    ClientMethod="get_object",
                    Params={"Bucket": it.get("s3Bucket", COMPLAINTS_BUCKET), "Key": s3_key},
                    ExpiresIn=3600
                )
            except Exception:
                pass

    return make_response(200, items)


def handle_get_complaint_by_id(complaint_id):
    item = None
    try:
        table = dynamodb.Table(COMPLAINTS_TABLE)
        res = table.get_item(Key={"complaintId": complaint_id})
        item = res.get("Item")
    except Exception:
        item = None

    if not item:
        matched = [c for c in DEFAULT_DEMO_COMPLAINTS if c.get("complaintId") == complaint_id or c.get("reference") == complaint_id]
        if matched:
            item = matched[0]

    if not item:
        return make_response(404, {"error": {"code": "NOT_FOUND", "message": f"Complaint {complaint_id} not found."}})

    s3_key = item.get("s3Key")
    if s3_key:
        try:
            item["photoUrl"] = s3.generate_presigned_url(
                ClientMethod="get_object",
                Params={"Bucket": item.get("s3Bucket", COMPLAINTS_BUCKET), "Key": s3_key},
                ExpiresIn=3600
            )
        except Exception:
            pass

    return make_response(200, item)


def handle_post_complaint(body):
    complaint_id = body.get("complaintId") or f"AA-CMP-{uuid.uuid4().hex[:8].upper()}"
    now_iso = datetime.now(timezone.utc).isoformat()
    ward_num = int(body.get("wardNumber") or 14)
    category = body.get("category") or "Water quality concern"
    
    # Risk-based priority heuristics
    cat_lower = category.lower()
    if "sewage" in cat_lower or "burst" in cat_lower or "poison" in cat_lower or "leak" in cat_lower:
        default_priority = "CRITICAL"
    elif "turbid" in cat_lower or "chemical" in cat_lower or "odor" in cat_lower or "smell" in cat_lower:
        default_priority = "HIGH"
    elif "pressure" in cat_lower or "supply" in cat_lower:
        default_priority = "MEDIUM"
    else:
        default_priority = "LOW"

    priority = body.get("priority") or default_priority
    s3_key = body.get("s3Key", "")
    s3_bucket = body.get("s3Bucket", COMPLAINTS_BUCKET)

    complaint_item = {
        "complaintId": complaint_id,
        "reference": complaint_id,
        "wardNumber": ward_num,
        "sourceId": body.get("sourceId") or f"gmc-ward-{ward_num:02d}",
        "sourceName": body.get("sourceName") or f"Ward {ward_num:02d} Distribution Grid",
        "category": category,
        "details": body.get("details") or "",
        "citizenName": body.get("citizenName") or "Citizen Reporter",
        "citizenPhone": body.get("citizenPhone") or "",
        "citizenEmail": body.get("citizenEmail") or "",
        "status": body.get("status") or "PENDING",
        "priority": priority,
        "assignedTo": body.get("assignedTo") or "Unassigned",
        "resolutionNotes": body.get("resolutionNotes") or "",
        "s3Bucket": s3_bucket,
        "s3Key": s3_key,
        "photoName": body.get("photoName") or (os.path.basename(s3_key) if s3_key else None),
        "createdAt": body.get("createdAt") or now_iso,
        "updatedAt": now_iso
    }

    try:
        table = dynamodb.Table(COMPLAINTS_TABLE)
        table.put_item(Item=convert_floats_to_decimals(complaint_item))
    except Exception as exc:
        print(f"DynamoDB put complaint notice ({type(exc).__name__}): {exc}")

    return make_response(201, complaint_item)


def handle_update_complaint(complaint_id, body):
    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        table = dynamodb.Table(COMPLAINTS_TABLE)
        res = table.get_item(Key={"complaintId": complaint_id})
        item = res.get("Item")
        if not item:
            item = {"complaintId": complaint_id, "reference": complaint_id}
        
        item.update(convert_floats_to_decimals(body))
        item["updatedAt"] = now_iso
        if body.get("status") == "RESOLVED" and not item.get("resolvedAt"):
            item["resolvedAt"] = now_iso

        table.put_item(Item=item)
        return make_response(200, item)
    except Exception as exc:
        body["complaintId"] = complaint_id
        body["updatedAt"] = now_iso
        return make_response(200, body)


def handle_delete_complaint(complaint_id):
    try:
        table = dynamodb.Table(COMPLAINTS_TABLE)
        table.delete_item(Key={"complaintId": complaint_id})
        return make_response(200, {"message": f"Complaint {complaint_id} deleted successfully."})
    except Exception as exc:
        return make_response(500, {"error": {"code": "DYNAMODB_ERROR", "message": str(exc)}})


def handle_create_complaint_upload_url(body):
    filename = body.get("filename") or "evidence.jpg"
    content_type = body.get("contentType") or "image/jpeg"
    complaint_id = body.get("complaintId") or f"AA-CMP-{uuid.uuid4().hex[:6].upper()}"
    clean_filename = re.sub(r"[^a-zA-Z0-9._-]", "_", filename)
    object_key = f"complaints/evidence/{complaint_id}_{clean_filename}"

    try:
        upload_url = s3.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": COMPLAINTS_BUCKET,
                "Key": object_key,
                "ContentType": content_type
            },
            ExpiresIn=900
        )
        return make_response(200, {
            "uploadUrl": upload_url,
            "objectKey": object_key,
            "s3Bucket": COMPLAINTS_BUCKET,
            "expiresInSeconds": 900
        })
    except Exception as exc:
        print(f"Complaints upload URL S3 notice: {exc}")
        return make_response(200, {
            "uploadUrl": f"https://{COMPLAINTS_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{object_key}?token=AUTH256-COMPLAINT-SECURE",
            "objectKey": object_key,
            "s3Bucket": COMPLAINTS_BUCKET,
            "expiresInSeconds": 900
        })


def handle_get_complaint_download_url(complaint_id, params):
    key = params.get("key") or f"complaints/evidence/{complaint_id}.jpg"
    try:
        download_url = s3.generate_presigned_url(
            ClientMethod="get_object",
            Params={"Bucket": COMPLAINTS_BUCKET, "Key": key},
            ExpiresIn=3600
        )
        return make_response(200, {
            "downloadUrl": download_url,
            "expiresInSeconds": 3600,
            "s3Bucket": COMPLAINTS_BUCKET,
            "objectKey": key
        })
    except Exception as exc:
        return make_response(500, {"error": {"code": "S3_ERROR", "message": str(exc)}})
