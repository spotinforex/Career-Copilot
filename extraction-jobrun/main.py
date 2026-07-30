import json
from db_class import CareerCopilotDB
from agent import run_extraction_agent
from sentence_transformers import SentenceTransformer
'''from dotenv import load_dotenv
load_dotenv()'''

import boto3
from botocore.exceptions import ClientError

import logging

logging.basicConfig(level=logging.INFO)

def get_secret(secret_name, region_name="us-east-2"):
    session = boto3.session.Session()
    client = session.client(service_name='secretsmanager', region_name=region_name)
    try:
        response = client.get_secret_value(SecretId=secret_name)
    except ClientError as e:
        raise RuntimeError(f"Could not retrieve secret '{secret_name}': {e}") from e
    return json.loads(response["SecretString"])

secrets = get_secret("career-copilot-prod")

url = secrets['DATABASE_URL']

db = CareerCopilotDB(url).connect()

model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")


def handler(event, context):
    logging.info("Event Recieved, Process Intialized")
    for record in event["Records"]:
        msg = json.loads(record["body"])
        facts = extract_facts(msg["user_msg"], msg["assistant_msg"])
        if not facts:
            continue
        write_facts(msg["user_id"], msg["conversation_id"], facts)
    logging.info("Event Processed, Process Completed Successfully")

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
        fact_type = fact["type"]
        fields = fact.get("fields", {})

        if fact_type == "bio_data":
            if fields:
                db.upsert_bio_data(user_id, **fields)
            continue

        content = fact.get("content", "")
        embedding = model.encode(content).tolist()
        embedding_str = "[" + ",".join(map(str, embedding)) + "]"

        if db.memory_exists(user_id=user_id, embedding=embedding_str, memory_type=fact_type):
            continue

        if fact_type == "resume_edit":
            db.append_resume_edit(user_id=user_id, role_tag=fact.get("role_tag"), edit=content)
            continue

        if fact_type == "project":
            row = db.insert("projects", {
                "user_id": user_id,
                "title": content,
                "description": fields.get("description", ""),
                "skills_used": fields.get("skills_used", []),
                "relevant_roles": fields.get("relevant_roles", []),
            })
            source_table, source_id = "projects", row["id"]

        elif fact_type == "skill":
            existing = db.fetch_one("skills", where={"user_id": user_id, "name": content})
            if existing:
                row = db.update("skills", {"source": fields.get("source", "conversation")}, {"id": existing["id"]})[0]
            else:
                row = db.insert("skills", {
                    "user_id": user_id,
                    "name": content,
                    "source": fields.get("source", "conversation"),
                })
            source_table, source_id = "skills", row["id"]

        elif fact_type == "certification":
            row = db.insert("certifications", {
                "user_id": user_id,
                "name": content,
                "issuer": fields.get("issuer"),
            })
            source_table, source_id = "certifications", row["id"]

        elif fact_type == "goal":
            db.update("career_goals", {"is_active": False}, {"user_id": user_id, "is_active": True})
            row = db.insert("career_goals", {
                "user_id": user_id,
                "target_role": content,
                "is_active": True,
            })
            source_table, source_id = "career_goals", row["id"]

        elif fact_type == "application":
            row = db.insert("applications", {
                "user_id": user_id,
                "company": fields.get("company"),
                "role_title": fields.get("role_title"),
                "status": fields.get("status", "applied"),
            })
            source_table, source_id = "applications", row["id"]

        else:
            # unknown/unclassified fact type — fall back to conversation-level
            # embedding only, so nothing is silently dropped
            source_table = fact.get("source_table", "conversation")
            source_id = fact.get("source_id", conversation_id)

        db.save_embedding(
            user_id=user_id,
            source_table=source_table,
            source_id=source_id,
            memory_type=fact_type,
            text_summary=content,
            embedding=embedding,
            is_pinned=fact.get("pin", False),
        )