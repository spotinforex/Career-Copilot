import json
import os
import uuid
from datetime import datetime, timezone

import redis
from dotenv import load_dotenv

load_dotenv()

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

_artifact_client = None


def get_artifact_client():
    """Separate lazy client for artifact caching — kept distinct from
    SessionManager's client so a failure/timeout in one doesn't affect the other."""
    global _artifact_client
    if _artifact_client is None:
        _artifact_client = redis.Redis.from_url(redis_url, decode_responses=True)
    return _artifact_client


def store_artifact_url(artifact_id: str, url: str, ttl_seconds: int = 3600):
    get_artifact_client().set(f"artifact:{artifact_id}", url, ex=ttl_seconds)


def get_artifact_url(artifact_id: str) -> str | None:
    return get_artifact_client().get(f"artifact:{artifact_id}")


def delete_artifact(artifact_id: str):
    get_artifact_client().delete(f"artifact:{artifact_id}")


class Session:
    def __init__(self, user_id: str, session_id: str = None,
                 history: list = None, cached_context: dict = None):
        self.user_id = user_id
        self.session_id = session_id or str(uuid.uuid4())
        self.history = history or []
        self.cached_context = cached_context or {}

    def add_turn(self, role: str, content: str):
        self.history.append({
            "role": role,
            "content": content,
            "ts": datetime.now(timezone.utc).isoformat()
        })

    def to_dict(self) -> dict:
        return {
            "user_id": self.user_id,
            "session_id": self.session_id,
            "history": self.history,
            "cached_context": self.cached_context,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "Session":
        return cls(
            user_id=data["user_id"],
            session_id=data["session_id"],
            history=data.get("history", []),
            cached_context=data.get("cached_context", {}),
        )


class SessionManager:
    def __init__(self, ttl_seconds: int = 60 * 60 * 24):
        self.r = redis.Redis.from_url(redis_url, decode_responses=True, socket_connect_timeout=1, socket_timeout=1)
        self.ttl_seconds = ttl_seconds
        self._fallback_sessions: dict[str, str] = {}
        self._redis_available = True

        try:
            self.r.ping()
        except Exception:
            self._redis_available = False

    def _key(self, session_id: str) -> str:
        return f"session:{session_id}"

    def _read(self, session_id: str):
        if not self._redis_available:
            return self._fallback_sessions.get(self._key(session_id))
        try:
            return self.r.get(self._key(session_id))
        except Exception:
            self._redis_available = False
            return self._fallback_sessions.get(self._key(session_id))

    def _write(self, session_id: str, value: str):
        if not self._redis_available:
            self._fallback_sessions[self._key(session_id)] = value
            return
        try:
            self.r.set(self._key(session_id), value, ex=self.ttl_seconds)
        except Exception:
            self._redis_available = False
            self._fallback_sessions[self._key(session_id)] = value

    def get_or_create(self, user_id: str, session_id: str = None) -> Session:
        if session_id:
            raw = self._read(session_id)
            if raw:
                return Session.from_dict(json.loads(raw))
        session = Session(user_id, session_id)
        self.save(session)
        return session

    def save(self, session: Session):
        self._write(session.session_id, json.dumps(session.to_dict()))

    def delete(self, session_id: str):
        if self._redis_available:
            try:
                self.r.delete(self._key(session_id))
                return
            except Exception:
                self._redis_available = False
        self._fallback_sessions.pop(self._key(session_id), None)