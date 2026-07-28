import json
import uuid
import boto3
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from google import genai
import os
from dotenv import load_dotenv
load_dotenv()


gemini = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

_s3_client = None

def get_s3_client():
    global _s3_client
    if _s3_client is None:
        _s3_client = boto3.client("s3")
    return _s3_client

s3 = get_s3_client()
BUCKET = "careercopilot-artifacts"


async def gather_raw_material(user_id: str, role_tag: str, db, embed_fn):
    """Pull everything relevant, not just an existing resume for this exact role."""
    all_projects = db.fetch_all("projects", where={"user_id": user_id})
    all_skills = db.fetch_all("skills", where={"user_id": user_id})
    all_certs = db.fetch_all("certifications", where={"user_id": user_id})
    goal = db.fetch_one("career_goals", where={"user_id": user_id, "is_active": True})

    # semantic pass: which existing resumes/projects are conceptually close to this role,
    # even if their role_tag doesn't literally match
    role_embedding = embed_fn(role_tag)
    similar = db.search_similar(user_id, role_embedding, limit=8)

    return {
        "projects": all_projects,
        "skills": [s["name"] for s in all_skills],
        "certifications": [c["name"] for c in all_certs],
        "goal": goal,
        "similar_context": similar,   # pointers into resumes/projects that scored close to this role
    }


def synthesize_resume(role_tag: str, raw_material: dict) -> dict:
    """One LLM call: turn raw material into a tailored resume, not a copy of an old one."""
    prompt = f"""You are building a tailored resume for the target role: {role_tag}.

    Available raw material about this candidate (do not invent facts not present here):

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

    if not raw_material["projects"] and not raw_material["skills"]:
        return {"error": "Not enough information in memory yet to build a resume for this role."}

    content = synthesize_resume(role_tag, raw_material)

    # this becomes a NEW resume version — memory grows, not just a one-off file
    resume = db.save_new_resume_version(session.user_id, role_tag, content)

    pdf_url = render_pdf(role_tag, content, session.user_id)
    return {"pdf_url": pdf_url, "resume_id": resume["id"], "content": content}


def render_pdf(role_tag: str, content: dict, user_id: str) -> str:
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    y = 750

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

    key = f"generated/{user_id}/{uuid.uuid4()}.pdf"
    s3.put_object(Bucket=BUCKET, Key=key, Body=buffer.read(), ContentType="application/pdf")
    return s3.generate_presigned_url("get_object", Params={"Bucket": BUCKET, "Key": key}, ExpiresIn=3600)