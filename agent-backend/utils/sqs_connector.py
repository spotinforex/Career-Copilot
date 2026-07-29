import json
import logging
import os
import boto3
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO)

_sqs_client = None


def get_sqs_client():
    global _sqs_client
    if _sqs_client is None:
        _sqs_client = boto3.client("sqs", region_name="us-east-2")
    return _sqs_client


def queue_extraction_job(user_id: str, user_msg: str, assistant_msg: str, session_id: str = None):
    """Fire-and-forget — failures here shouldn't break the user's chat response."""
    try:
        sqs = get_sqs_client()
        sqs.send_message(
            QueueUrl=os.environ["SQS_QUEUE_URL"],
            MessageBody=json.dumps({
                "user_id": user_id,
                "conversation_id": session_id,
                "user_msg": user_msg,
                "assistant_msg": assistant_msg,
            })
        )
    except Exception as exc:
        logging.error(f"Failed to queue extraction job: {exc}")