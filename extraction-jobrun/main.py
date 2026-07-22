import json
from db_class import CareerCopilotDB
from agent import run_extraction_agent
from sentence_transformers import SentenceTransformer
'''from dotenv import load_dotenv
load_dotenv()'''

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

url = secrets['DATABASE_URL']

db = CareerCopilotDB(url).connect()

model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")


def handler(event, context):
    for record in event["Records"]:
        msg = json.loads(record["body"])
        facts = extract_facts(msg["user_msg"], msg["assistant_msg"])
        if not facts:
            continue
        write_facts(msg["user_id"], msg["conversation_id"], facts)

def extract_facts(user_msg, assistant_msg):
    """
    Use the extraction agent to extract facts from the user and assistant messages.
    """
    prompt = f"""
    User message: {user_msg}
    Assistant message: {assistant_msg}
    """
    result = run_extraction_agent(prompt)
    if not result:
        return []
    return result.get("facts", [])


def write_facts(user_id, conversation_id, facts):

    for fact in facts:

        embedding = model.encode(
            fact["content"]
        ).tolist()

        embedding_str = "[" + ",".join(map(str, embedding)) + "]"

        if db.memory_exists(
            user_id=user_id,
            embedding=embedding_str,
            memory_type=fact["type"],
        ):
            continue

        if fact["type"] == "resume_edit":

            db.append_resume_edit(
                user_id=user_id,
                role_tag=fact["role_tag"],
                edit=fact["content"],
            )

            continue

        db.save_embedding(
            user_id=user_id,
            source_table=fact.get(
                "source_table",
                "conversation",
            ),
            source_id=fact.get("source_id", conversation_id),
            memory_type=fact["type"],
            text_summary=fact["content"],
            embedding=embedding,
            is_pinned=fact.get("pin", False),
        )