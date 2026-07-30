#import os
from typing import Optional

#import httpx
import jwt
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from utils.session import SessionManager,Session
from utils.upload import handle_upload
from utils.sqs_connector import queue_extraction_job
from database.db import CareerCopilotDB
from database.mcp_config import CockroachMCPClient
from agent_process.agent_loop import run_agent_turn as agent_run_turn
#from dotenv import load_dotenv
#load_dotenv()

from utils.secret_manager import secrets


app = FastAPI(title="Career Copilot Backend", version="0.1.0")

origins = [
    secrets["FRONTEND_ORIGIN"] or "http://localhost:5173",
    secrets["FRONTEND_ORIGIN"] or "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


class ClerkUser(BaseModel):
    user_id: str
    email: Optional[str] = None


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    session_id: str
    user_id: str


class UploadResponse(BaseModel):
    s3_key: str
    resume_id: str
    content: dict
    message: str          # <-- NEW: conversational response from the agent


session_manager = SessionManager()


async def get_current_user(authorization: Optional[str] = Header(None)) -> ClerkUser:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    token = authorization.split(" ", 1)[1].strip()
    secret_key = secrets["CLERK_SECRET_KEY"]
    if not secret_key:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="CLERK_SECRET_KEY is not configured")

    try:
        payload = jwt.decode(token, secret_key, algorithms=["HS256"], options={"verify_signature": False})
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    user_id = payload.get("sub") or payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing user identity")

    email = None
    if payload.get("email"):
        email = payload["email"]
    elif payload.get("email_addresses"):
        email = payload["email_addresses"][0].get("email_address")

    return ClerkUser(user_id=str(user_id), email=email)


def get_mcp_credentials():
    """Single source of truth for MCP env vars — avoids repeating getenv calls per endpoint."""
    return (
        secrets["db_url"],
        secrets["db_secret_key"],
    )


async def resolve_db_user_id(current_user: ClerkUser, db) -> str:
    """Create or fetch the matching database user row and return its UUID-backed id."""
    if db is None:
        return current_user.user_id

    email = current_user.email or f"{current_user.user_id}@clerk.local"
    user_row = db.get_or_create_user(email)
    return str(user_row["id"])


async def open_agent_dependencies():
    """Opens a fresh db + mcp connection. Reconnecting per request is deliberate here —
    it sidesteps the MCP session-staleness issue we ran into earlier."""
    db = None
    mcp = None

    if CareerCopilotDB is not None:
        try:
            db = CareerCopilotDB()
            db.connect()
        except Exception:
            db = None

    mcp_url, mcp_auth_token = get_mcp_credentials()
    if CockroachMCPClient is not None and mcp_url and mcp_auth_token:
        try:
            mcp = CockroachMCPClient(mcp_url, mcp_auth_token)
            await mcp.connect()
        except Exception:
            mcp = None

    return db, mcp


async def close_agent_dependencies(db, mcp):
    if mcp is not None:
        try:
            await mcp.close()
        except Exception:
            pass
    if db is not None:
        try:
            db.close()
        except Exception:
            pass


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Career Copilot backend is running"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/users")
async def ensure_user(current_user: ClerkUser = Depends(get_current_user)) -> dict[str, str]:
    db, _ = await open_agent_dependencies()
    try:
        if db is None:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database is unavailable")
        user_id = await resolve_db_user_id(current_user, db)
        return {"user_id": user_id, "email": current_user.email or f"{current_user.user_id}@clerk.local"}
    finally:
        await close_agent_dependencies(db, None)


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, current_user: ClerkUser = Depends(get_current_user)) -> ChatResponse:
    db, mcp = await open_agent_dependencies()
    try:
        user_id = await resolve_db_user_id(current_user, db)

        session_id = request.session_id
        if session_id is None:
            session = session_manager.get_or_create(user_id)
        else:
            session = session_manager.get_or_create(user_id, session_id)

        if agent_run_turn is None:
            response_text = (
                "The agent loop is not available in this environment yet, "
                "but the API is wired and ready for the next integration step."
            )
        else:
            response_text = await agent_run_turn(request.message, session, mcp, db)
    except Exception as exc:
        response_text = f"The agent hit an error: {exc}"
    finally:
        await close_agent_dependencies(db, mcp)

    queue_extraction_job(user_id, request.message, response_text,session_id)

    session_manager.save(session)
    return ChatResponse(
        response=response_text,
        session_id=session.session_id,
        user_id=user_id,
    )


@app.post("/upload", response_model=UploadResponse)
async def upload_resume(
    role_tag: str = Form(...),
    session_id: Optional[str] = Form(None),
    file: UploadFile = File(...),
    current_user: ClerkUser = Depends(get_current_user),
) -> UploadResponse:
    db, mcp = await open_agent_dependencies()
    try:
        user_id = await resolve_db_user_id(current_user, db)
        file_bytes = await file.read()
        result = await handle_upload(user_id, file_bytes, file.filename or "upload", role_tag, db)

        # get/create the session so the follow-up feels continuous with any existing conversation
        if session_id is None:
            session = session_manager.get_or_create(user_id)
        else:
            session = session_manager.get_or_create(user_id, session_id)
        session.cached_context = {}  # force re-hydration so the agent sees the new resume next turn

        conversational_message = ""
        if agent_run_turn is not None:
            prompt = (
                f"The user just uploaded a resume for the target role '{role_tag}'. "
                f"Here's what was extracted: {result['content']}. "
                f"Acknowledge the upload naturally and briefly note anything notable "
                f"(e.g. strong areas, or anything sparse) — don't just repeat the data back verbatim."
            )
            try:
                conversational_message = await agent_run_turn(prompt, session, mcp, db)
            except Exception as exc:
                conversational_message = (
                    f"Got your resume for {role_tag} — saved it, though I hit a snag "
                    f"summarizing it just now ({exc})."
                )
        else:
            conversational_message = f"Got your resume for {role_tag} — saved it to your profile."

        queue_extraction_job(user_id, "I uploaded a resume", conversational_message,session_id)

        session_manager.save(session)

        return UploadResponse(
            s3_key=result["s3_key"],
            resume_id=result["resume_id"],
            content=result["content"],
            message=conversational_message,
        )
    except Exception as exc:
        raise RuntimeError(f"Upload failed: {exc}") from exc
    finally:
        await close_agent_dependencies(db, mcp)