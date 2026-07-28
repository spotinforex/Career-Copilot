# main.py
import json
import logging
import os
import boto3
from dotenv import load_dotenv
load_dotenv()

logging.basicConfig(level=logging.INFO)

_sqs_client = None

def get_sqs_client():
    """Lazy init — avoids the import-time boto3.client() anti-pattern from earlier."""
    global _sqs_client
    if _sqs_client is None:
        _sqs_client = boto3.client("sqs", "us-east-2")
    return _sqs_client


def queue_extraction_job(user_id: str, user_msg: str, assistant_msg: str):
    """Fire-and-forget — failures here shouldn't break the user's chat response."""
    try:
        sqs = get_sqs_client()
        sqs.send_message(
            QueueUrl=os.getenv("sqs_queue_url"),
            MessageBody=json.dumps({
                "user_id": user_id,
                "user_msg": user_msg,
                "assistant_msg": assistant_msg,
            })
        )
    except Exception as exc:
        # log, don't raise — extraction is best-effort background work,
        # the user's actual chat response must still succeed regardless
        logging.error(f"Failed to queue extraction job: {exc}")