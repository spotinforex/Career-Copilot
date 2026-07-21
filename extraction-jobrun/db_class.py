import os
import logging
import json
import psycopg2
from psycopg2.extras import RealDictCursor, execute_values
from dotenv import load_dotenv
from pgvector.psycopg2 import register_vector

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
        register_vector(self.conn)
        logger.info("Successfully connected to database")
        return self

    def close(self):
        if self.conn and not self.conn.closed:
            self.conn.close()
            logger.info("Connection closed")

    def __enter__(self):
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    # ---------- low-level helpers ----------

    def execute(self, query: str, params: tuple = None, fetch: bool = False):
        """Run any raw query. fetch=True for SELECTs."""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params)
            self.conn.commit()
            if fetch:
                return cur.fetchall()
            return None

    # ---------- generic CRUD ----------

    def insert(self, table: str, data: dict, returning: str = "*"):
        """Insert one row. Returns the inserted row (as dict)."""
        columns = list(data.keys())
        values = list(data.values())
        placeholders = ", ".join(["%s"] * len(columns))
        col_names = ", ".join(columns)
        query = f"INSERT INTO {table} ({col_names}) VALUES ({placeholders}) RETURNING {returning}"

        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, values)
            row = cur.fetchone()
            self.conn.commit()
            return row

    def insert_many(self, table: str, columns: list[str], rows: list[tuple]):
        """Bulk insert. rows = [(val1, val2, ...), ...] matching columns order."""
        col_names = ", ".join(columns)
        query = f"INSERT INTO {table} ({col_names}) VALUES %s"
        with self.conn.cursor() as cur:
            execute_values(cur, query, rows)
            self.conn.commit()

    def update(self, table: str, data: dict, where: dict, returning: str = "*"):
        """Update rows matching `where`. Returns updated rows."""
        set_clause = ", ".join([f"{k} = %s" for k in data.keys()])
        where_clause = " AND ".join([f"{k} = %s" for k in where.keys()])
        query = f"UPDATE {table} SET {set_clause} WHERE {where_clause} RETURNING {returning}"
        values = list(data.values()) + list(where.values())

        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, values)
            rows = cur.fetchall()
            self.conn.commit()
            return rows

    def fetch_one(self, table: str, where: dict = None, columns: str = "*"):
        """Fetch a single row matching `where`. None if no match."""
        query = f"SELECT {columns} FROM {table}"
        values = []
        if where:
            where_clause = " AND ".join([f"{k} = %s" for k in where.keys()])
            query += f" WHERE {where_clause}"
            values = list(where.values())
        query += " LIMIT 1"

        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, values)
            return cur.fetchone()

    def fetch_all(self, table: str, where: dict = None, columns: str = "*",
                  order_by: str = None, limit: int = None):
        """Fetch all rows matching `where`."""
        query = f"SELECT {columns} FROM {table}"
        values = []
        if where:
            where_clause = " AND ".join([f"{k} = %s" for k in where.keys()])
            query += f" WHERE {where_clause}"
            values = list(where.values())
        if order_by:
            query += f" ORDER BY {order_by}"
        if limit:
            query += f" LIMIT {limit}"

        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, values)
            return cur.fetchall()

    def delete(self, table: str, where: dict):
        """Delete rows matching `where`."""
        where_clause = " AND ".join([f"{k} = %s" for k in where.keys()])
        query = f"DELETE FROM {table} WHERE {where_clause}"
        with self.conn.cursor() as cur:
            cur.execute(query, list(where.values()))
            deleted = cur.rowcount
            self.conn.commit()
            return deleted

    # ---------- table-specific helpers ----------

    def get_current_resume(self, user_id: str, role_tag: str):
        return self.fetch_one(
            "resumes",
            where={"user_id": user_id, "role_tag": role_tag, "is_current": True}
        )

    def save_new_resume_version(self, user_id: str, role_tag: str, content: dict):
        """Insert a new resume version and demote the previous current one."""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "UPDATE resumes SET is_current = false "
                "WHERE user_id = %s AND role_tag = %s AND is_current = true",
                (user_id, role_tag)
            )
            cur.execute(
                "SELECT COALESCE(MAX(version), 0) + 1 AS next_version FROM resumes "
                "WHERE user_id = %s AND role_tag = %s",
                (user_id, role_tag)
            )
            next_version = cur.fetchone()["next_version"]

            cur.execute(
                "INSERT INTO resumes (user_id, role_tag, version, content, is_current) "
                "VALUES (%s, %s, %s, %s, true) RETURNING *",
                (user_id, role_tag, next_version, json.dumps(content))
            )
            row = cur.fetchone()
            self.conn.commit()
            return row

    # ---------- embeddings / semantic search ----------

    def save_embedding(self, user_id: str, source_table: str, source_id: str,
                        memory_type: str, text_summary: str, embedding: list[float],
                        is_pinned: bool = False):
        return self.insert("memory_embeddings", {
            "user_id": user_id,
            "source_table": source_table,
            "source_id": source_id,
            "memory_type": memory_type,
            "text_summary": text_summary,
            "embedding": embedding,
            "is_pinned": is_pinned
        })

    def search_similar(self, user_id: str, query_embedding: list[float],
                        memory_type: str = None, limit: int = 5):
        """Nearest-neighbor search over this user's embeddings. Returns pointers, not full content."""
        query = """
            SELECT source_table, source_id, memory_type, text_summary, is_pinned,
                   embedding <-> %s AS distance
            FROM memory_embeddings
            WHERE user_id = %s
        """
        params = [query_embedding, user_id]
        if memory_type:
            query += " AND memory_type = %s"
            params.append(memory_type)
        query += " ORDER BY distance LIMIT %s"
        params.append(limit)

        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params)
            return cur.fetchall()

    def get_pinned_memories(self, user_id: str):
        """Always-include memories (e.g. career goal) regardless of similarity score."""
        return self.fetch_all("memory_embeddings", where={"user_id": user_id, "is_pinned": True})

    def memory_exists(
    self,
    user_id: str,
    embedding: list[float],
    memory_type: str,
    threshold: float = 0.10,
    ):
        """
        Returns True if a very similar memory already exists.
        """

        query = """
            SELECT embedding <=> %s::VECTOR AS distance
            FROM memory_embeddings
            WHERE user_id = %s
            AND memory_type = %s
            ORDER BY embedding <=> %s::VECTOR
            LIMIT 1
        """

        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                query,
                (
                    embedding,
                    user_id,
                    memory_type,
                    embedding,
                ),
            )

            row = cur.fetchone()

            if row is None:
                return False

            return row["distance"] < threshold
        
    def append_resume_edit(
        self,
        user_id: str,
        role_tag: str,
        edit: str,
        ):
            resume = self.get_current_resume(user_id, role_tag)

            if not resume:
                return None

            content = resume["content"]

            if isinstance(content, str):
                content = json.loads(content)

            content.setdefault("edits", [])
            content["edits"].append(edit)

            self.update(
                "resumes",
                {"content": json.dumps(content)},
                {"id": resume["id"]},
            )

            return resume