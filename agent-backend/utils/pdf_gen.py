import json
import uuid
import boto3
from botocore.config import Config
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from google import genai
import os
from dotenv import load_dotenv
load_dotenv()
from utils.embed_process import encode_text as embed_fn


gemini = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

_s3_client = None

def get_s3_client():
    global _s3_client
    if _s3_client is None:
        _s3_client = boto3.client(
            "s3",
           region_name="us-east-2",
           config=Config(signature_version="s3v4"))
    return _s3_client

BUCKET = "careercopilot-artifacts"


async def gather_raw_material(user_id: str, role_tag: str, db, embed_fn):
    """Pull everything relevant, not just an existing resume for this exact role."""
    bio = db.get_bio_data(user_id)  
    all_projects = db.fetch_all("projects", where={"user_id": user_id})
    all_skills = db.fetch_all("skills", where={"user_id": user_id})
    all_certs = db.fetch_all("certifications", where={"user_id": user_id})
    goal = db.fetch_one("career_goals", where={"user_id": user_id, "is_active": True})

    role_embedding = embed_fn(role_tag)
    similar = db.search_similar(user_id, role_embedding, limit=8)
    print(f"""
        bio: {bio}
        projects: {all_projects}
        skills: {[s["name"] for s in all_skills]}
        certifications: {[c["name"] for c in all_certs]}
        goal: {goal}
        similar_context: {similar}
        """)
    return {
        "bio": bio,  # NEW
        "projects": all_projects,
        "skills": [s["name"] for s in all_skills],
        "certifications": [c["name"] for c in all_certs],
        "goal": goal,
        "similar_context": similar,
    }


def synthesize_resume(role_tag: str, raw_material: dict) -> dict:
    """One LLM call: turn raw material into a tailored resume, not a copy of an old one."""
    bio = raw_material.get("bio") or {}

    prompt = f"""You are building a tailored resume for the target role: {role_tag}.

    Available raw material about this candidate (do not invent facts not present here):

    Name: {bio.get('name', 'Not provided')}
    Location: {bio.get('location', 'Not provided')}
    Job titles used: {bio.get('job_titles', [])}

    Projects:
    {json.dumps(raw_material['projects'], default=str, indent=2)}

    Skills: {raw_material['skills']}
    Certifications: {raw_material['certifications']}
    Career goal: {raw_material['goal']}

    Instructions:
    - Select and reframe ONLY the projects/skills genuinely relevant to {role_tag}.
    - Rewrite project descriptions as resume bullet points emphasizing impact, using the role's likely priorities
    (e.g. Software Engineer → system design, code quality, scalability; ML Engineer → modeling, data pipelines).
    - Do not fabricate employers, dates, or metrics not implied by the source material.
    - Output JSON only, matching this shape:
    {{
    "summary": "...",
    "experience": [{{"title": "...", "bullets": ["...", "..."]}}],
    "education": [],
    "skills": ["..."]
    }}
    """
    resp = gemini.models.generate_content(model="gemini-3.5-flash-lite", contents=prompt)
    text = resp.text.strip().removeprefix("```json").removesuffix("```").strip()
    return json.loads(text)


async def generate_pdf_resume(session, db, role_tag: str):
    raw_material = await gather_raw_material(session.user_id, role_tag, db, embed_fn)
    print("DEBUG generate_pdf_resume user_id:", session.user_id)

    if not raw_material["projects"] and not raw_material["skills"]:
        return {
            "status": "failed",
            "reason": "insufficient_memory",
            "user_facing_message": (
                f"I don't have enough saved projects or skills yet to build a "
                f"{role_tag} resume. Want to tell me about some, or upload an existing resume?"
            )
        }

    content = synthesize_resume(role_tag, raw_material)

    resume = db.save_new_resume_version(session.user_id, role_tag, content)

    pdf_url = render_pdf(role_tag, content, session.user_id, bio=raw_material.get("bio"))
    return {"pdf_url": pdf_url, "resume_id": resume["id"], "content": content}


def render_pdf(role_tag: str, content: dict, user_id: str, bio: dict = None) -> str:
    bio = bio or {}
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    y = 750

    # NEW — header block: name, then contact line, then role
    if bio.get("name"):
        c.setFont("Helvetica-Bold", 16)
        c.drawString(50, y, bio["name"])
        y -= 20

    contact_parts = [p for p in [bio.get("email"), bio.get("phone"), bio.get("location")] if p]
    if contact_parts:
        c.setFont("Helvetica", 9)
        c.drawString(50, y, " | ".join(contact_parts))
        y -= 14

    links = bio.get("other_links") or []
    if links:
        c.setFont("Helvetica", 9)
        c.drawString(50, y, " | ".join(links))
        y -= 14

    y -= 10
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, y, f"CV — {role_tag}")
    y -= 30

    c.setFont("Helvetica", 10)
    for line in content.get("summary", "").split("\n"):
        c.drawString(50, y, line)
        y -= 15

    for exp in content.get("experience", []):
        y -= 10
        c.setFont("Helvetica-Bold", 11)
        c.drawString(50, y, exp.get("title", ""))
        y -= 15
        c.setFont("Helvetica", 10)
        for bullet in exp.get("bullets", []):
            c.drawString(60, y, f"- {bullet}")
            y -= 13

    y -= 15
    c.setFont("Helvetica-Bold", 11)
    c.drawString(50, y, "Skills")
    y -= 15
    c.setFont("Helvetica", 10)
    c.drawString(50, y, ", ".join(content.get("skills", [])))

    c.save()
    buffer.seek(0)

    s3 = get_s3_client()  # only created when actually rendering, not at import time
    key = f"generated/{user_id}/{uuid.uuid4().hex[:12]}.pdf"
    s3.put_object(Bucket=BUCKET, Key=key, Body=buffer.read(), ContentType="application/pdf")
    url_link = s3.generate_presigned_url("get_object", Params={"Bucket": BUCKET, "Key": key}, ExpiresIn=3600)
    print(f"Debug url link: {url_link}")
    return url_link