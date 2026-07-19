import os
import logging
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class CareerCopilotDB:
    def __init__(self, database_url: str | None = None):
        self.database_url = database_url or os.environ["DATABASE_URL"]
        self.conn = None

    def connect(self):
        logger.info("Connecting to database")
        self.conn = psycopg2.connect(self.database_url)
        logger.info("Successfully connected to database")
        return self

    def close(self):
        if self.conn and not self.conn.closed:
            self.conn.close()
            logger.info("Connection closed")

    # context manager support: `with CareerCopilotDB() as db:`
    def __enter__(self):
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    def execute(self, query: str, params: tuple = None, fetch: bool = False):
        """Run any query. Set fetch=True for SELECTs, leave False for DDL/INSERT/UPDATE."""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params)
            self.conn.commit()
            if fetch:
                return cur.fetchall()
            return None

    def create_tables(self):
        statements = [
            """
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email STRING UNIQUE NOT NULL,
                created_at TIMESTAMPTZ DEFAULT now()
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS career_goals (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id),
                target_role STRING NOT NULL,
                notes STRING,
                is_active BOOL DEFAULT true,
                created_at TIMESTAMPTZ DEFAULT now()
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS resumes (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id),
                role_tag STRING NOT NULL,
                version INT NOT NULL DEFAULT 1,
                content JSONB NOT NULL,
                is_current BOOL DEFAULT true,
                created_at TIMESTAMPTZ DEFAULT now(),
                updated_at TIMESTAMPTZ DEFAULT now(),
                INDEX (user_id, role_tag, is_current)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS cover_letters (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id),
                resume_id UUID REFERENCES resumes(id),
                company STRING,
                job_title STRING,
                content STRING NOT NULL,
                created_at TIMESTAMPTZ DEFAULT now()
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS projects (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id),
                title STRING NOT NULL,
                description STRING,
                skills_used STRING[],
                relevant_roles STRING[],
                created_at TIMESTAMPTZ DEFAULT now()
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS skills (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id),
                name STRING NOT NULL,
                source STRING,
                created_at TIMESTAMPTZ DEFAULT now(),
                UNIQUE (user_id, name)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS certifications (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id),
                name STRING NOT NULL,
                issuer STRING,
                completed_at DATE,
                created_at TIMESTAMPTZ DEFAULT now()
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS applications (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id),
                company STRING NOT NULL,
                role_title STRING NOT NULL,
                resume_id UUID REFERENCES resumes(id),
                cover_letter_id UUID REFERENCES cover_letters(id),
                status STRING DEFAULT 'applied',
                applied_at TIMESTAMPTZ DEFAULT now()
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS conversations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id),
                session_id UUID NOT NULL,
                role STRING NOT NULL,
                content STRING NOT NULL,
                created_at TIMESTAMPTZ DEFAULT now(),
                INDEX (user_id, session_id, created_at)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS memory_embeddings (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id),
                source_table STRING NOT NULL,
                source_id UUID NOT NULL,
                memory_type STRING NOT NULL,
                text_summary STRING NOT NULL,
                embedding VECTOR(1536),
                is_pinned BOOL DEFAULT false,
                updated_at TIMESTAMPTZ DEFAULT now(),
                VECTOR INDEX (user_id, embedding)
            )
            """,
        ]

        for stmt in statements:
            table_name = stmt.split("EXISTS")[1].split("(")[0].strip()
            logger.info(f"Creating table if not exists: {table_name}")
            self.execute(stmt)

        logger.info("All tables created")


if __name__ == "__main__":
    with CareerCopilotDB() as db:
        db.create_tables()
        res = db.execute("SELECT now()", fetch=True)
        print(res)