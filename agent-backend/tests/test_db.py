import os
import json
from datetime import datetime
from database.db import CareerCopilotDB
from dotenv import load_dotenv

load_dotenv()

# Every table in your schema — listed explicitly rather than querying
# information_schema, since that's blocked on the MCP side and there's
# no reason to introspect dynamically for a one-off dump script.
TABLES = [
    "users",
    "career_goals",
    "resumes",
    "cover_letters",
    "projects",
    "skills",
    "certifications",
    "applications",
    "conversations",
    "bio_data",
    "memory_embeddings",
]


def json_default(obj):
    """Handles datetime and anything else json.dumps chokes on."""
    if isinstance(obj, datetime):
        return obj.isoformat()
    return str(obj)


def dump_table(db: CareerCopilotDB, table: str) -> list[dict]:
    if table == "memory_embeddings":
        # skip the actual vector — it's huge and unreadable as printed text;
        # keep everything else so you can still see what's stored
        rows = db.fetch_all(
            table,
            columns="id, user_id, source_table, source_id, memory_type, text_summary, is_pinned, updated_at"
        )
    else:
        rows = db.fetch_all(table)
    return rows


def data_in_db():
    db = CareerCopilotDB(os.getenv("DATABASE_URL")).connect()

    all_data = {}

    for table in TABLES:
        try:
            rows = dump_table(db, table)
            all_data[table] = rows
            print(f"\n=== {table} ({len(rows)} rows) ===")
            for row in rows:
                print(row)
        except Exception as exc:
            print(f"\n=== {table} — FAILED: {exc} ===")
            all_data[table] = {"error": str(exc)}

    db.close()

    output_path = "db_dump.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_data, f, default=json_default, indent=2)

    print(f"\nFull dump written to {output_path}")
    return all_data


if __name__ == "__main__":
    data_in_db()