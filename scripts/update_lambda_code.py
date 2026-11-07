#!/usr/bin/env python3
"""
Update backend/lambda_function.py to support full CRUD operations across all tables:
  - Rules (GET, POST, PUT, DELETE)
  - Thresholds (GET, POST, PUT, DELETE)
  - Sources (GET, POST, PUT, DELETE)
  - Alerts (GET, POST, PUT, DELETE)
  - Readings (GET, POST, PUT, DELETE)
  - Actions (GET, POST, PUT, DELETE)
  - Reports (GET, POST, PUT, DELETE)
Then packages and deploys the zip to AWS Lambda 'waterq-dev-api-handler'.
"""
from __future__ import annotations

import io
import os
import re
import zipfile
import boto3

REGION = os.environ.get("AWS_REGION", "ap-south-1")
PROFILE = os.environ.get("AWS_PROFILE", "aquaalert")

with open("backend/lambda_function.py", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update ALLOWED METHODS in make_response
code = code.replace(
    '"Access-Control-Allow-Methods": "GET, POST, OPTIONS"',
    '"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"'
)

# 2. Add table names if not present
if "RULES_TABLE =" not in code:
    marker = 'LAB_REPORTS_TABLE = os.environ.get("LAB_REPORTS_TABLE", "LabReports")'
    addition = (
        'LAB_REPORTS_TABLE = os.environ.get("LAB_REPORTS_TABLE", "LabReports")\n'
        'RULES_TABLE = os.environ.get("RULES_TABLE", "Rules")\n'
        'THRESHOLDS_TABLE = os.environ.get("THRESHOLDS_TABLE", "Thresholds")\n'
        'RULES_THRESHOLDS_TABLE = os.environ.get("RULES_THRESHOLDS_TABLE", "RulesThresholds")'
    )
    code = code.replace(marker, addition)

# 3. Update path regex in lambda_handler
old_regex = r'r"^/[^/]+(?=/(sources|readings|alerts|actions|reports))"'
new_regex = r'r"^/[^/]+(?=/(sources|readings|alerts|actions|reports|rules|thresholds|users))"'
code = code.replace(old_regex, new_regex)

# 4. Add route dispatches in lambda_handler
# We will inject the new route dispatch conditions right before `return make_response(404, ...)`
crud_routes_dispatch = '''
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
'''

if "handle_get_rules" not in code:
    code = code.replace(
        'return make_response(404, {\n            "error": {"code": "NOT_FOUND"',
        crud_routes_dispatch + '\n        return make_response(404, {\n            "error": {"code": "NOT_FOUND"'
    )

# 5. Add CRUD helper function definitions at the bottom of the file
crud_functions_code = '''

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
'''

if "def handle_get_rules" not in code:
    code += "\n" + crud_functions_code

with open("backend/lambda_function.py", "w", encoding="utf-8") as f:
    f.write(code)

print("Updated backend/lambda_function.py with all CRUD operations!")

# Create zip buffer
buf = io.BytesIO()
with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
    z.write("backend/lambda_function.py", "lambda_function.py")
buf.seek(0)
zip_bytes = buf.read()

print(f"Zipped lambda_function.py ({len(zip_bytes)} bytes). Deploying to Lambda 'waterq-dev-api-handler'...")
session = boto3.Session(profile_name=PROFILE, region_name=REGION)
lam = session.client("lambda")
res = lam.update_function_code(FunctionName="waterq-dev-api-handler", ZipFile=zip_bytes)
print(f"SUCCESS: Lambda function updated! LastModified: {res.get('LastModified')}, CodeSha256: {res.get('CodeSha256')}")
