import json
import logging
import os
from pathlib import Path

from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

log = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

import boto3
from botocore.exceptions import ClientError

def get_secret(secret_name, region_name="us-east-2"):
    session = boto3.session.Session()
    client = session.client(service_name='secretsmanager', region_name=region_name)
    try:
        response = client.get_secret_value(SecretId=secret_name)
    except ClientError as e:
        raise RuntimeError(f"Could not retrieve secret '{secret_name}': {e}") from e
    return response["SecretString"]

secrets = get_secret("career-copilot-prod")

api_key = secrets['DASHSCOPE_API_KEY']

client = OpenAI(
    api_key=api_key,
    base_url="https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
)

SYSTEM_PROMPT = Path("extraction_prompt.txt").read_text(encoding="utf-8")

def run_extraction_agent(message: str) -> dict:
    """
    Extraction Agent
    """
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user",   "content": message},
    ]

    response = client.chat.completions.create(
        model="qwen-plus",
        messages=messages,
    )

    raw = response.choices[0].message.content.strip()

    # Strip markdown fences if model wraps in ```json
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    try:
        result = json.loads(raw)
    except json.JSONDecodeError as e:
        log.error(f"Extraction agent returned invalid JSON: {e}\nRaw: {raw}")
        return None

    return result




