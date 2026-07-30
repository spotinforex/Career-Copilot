import json
import logging
import os

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)


def get_secret(secret_name, region_name=None):
    if not secret_name:
        return {}

    region_name = region_name or os.getenv("AWS_DEFAULT_REGION") or "us-east-2"
    session = boto3.session.Session()
    client = session.client(service_name="secretsmanager", region_name=region_name)

    try:
        response = client.get_secret_value(SecretId=secret_name)
    except ClientError as exc:
        logger.warning("Could not retrieve secret '%s' from Secrets Manager: %s", secret_name, exc)
        return {}
    except Exception as exc:
        logger.warning("Could not retrieve secret '%s': %s", secret_name, exc)
        return {}

    secret_string = response.get("SecretString")
    if not secret_string:
        return {}

    try:
        parsed = json.loads(secret_string)
    except json.JSONDecodeError:
        return {"value": secret_string}

    if isinstance(parsed, dict):
        return parsed
    return {"value": parsed}


def _get_environment_secrets():
    return {key: value for key, value in os.environ.items() if value not in (None, "")}


def load_secrets():
    merged = {}

    secret_name = "career-copilot-prod"
    secret_payload = get_secret(secret_name, os.getenv("AWS_DEFAULT_REGION"))
    if isinstance(secret_payload, dict):
        merged.update(secret_payload)

    merged.update(_get_environment_secrets())
    return merged


secrets = load_secrets()


def get_secret_value(name, default=None):
    return (
        secrets.get(name)
        or secrets.get(name.upper())
        or secrets.get(name.lower())
        or os.getenv(name)
        or os.getenv(name.upper())
        or os.getenv(name.lower())
        or default
    )
