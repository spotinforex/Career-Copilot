import json
import uuid
import boto3
from botocore.config import Config
from io import BytesIO
from google import genai
#import os
#from dotenv import load_dotenv
#load_dotenv()
from utils.embed_process import encode_text as embed_fn
from utils.session import store_artifact_url

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, ListFlowable, ListItem

from utils.secret_manager import get_secret_value


def get_gemini_client():
    api_key = get_secret_value("GEMINI_API_KEY") or get_secret_value("GOOGLE_API_KEY")
    if not api_key:
        return None
    return genai.Client(api_key=api_key)


gemini = get_gemini_client()

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
    bio = db.get_bio_data(user_id)
    all_projects = db.fetch_all("projects", where={"user_id": user_id})
    all_skills = db.fetch_all("skills", where={"user_id": user_id})
    all_certs = db.fetch_all("certifications", where={"user_id": user_id})
    all_education = db.fetch_all("education", where={"user_id": user_id})  # NEW
    goal = db.fetch_one("career_goals", where={"user_id": user_id, "is_active": True})

    role_embedding = embed_fn(role_tag)
    similar = db.search_similar(user_id, role_embedding, limit=8)
    return {
        "bio": bio,
        "projects": all_projects,
        "skills": [s["name"] for s in all_skills],
        "certifications": [c["name"] for c in all_certs],
        "education": all_education,  
        "goal": goal,
        "similar_context": similar,
    }


def build_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name="NameHeader", fontName="Helvetica-Bold", fontSize=18, spaceAfter=10  # was 4
    ))
    styles.add(ParagraphStyle(
        name="ContactLine", fontName="Helvetica", fontSize=9, textColor="#444444", spaceAfter=14  # was 10
    ))
    styles.add(ParagraphStyle(
        name="SectionHeader", fontName="Helvetica-Bold", fontSize=12,
        spaceBefore=14, spaceAfter=6, textColor="#1a1a1a"
    ))
    styles.add(ParagraphStyle(
        name="JobTitle", fontName="Helvetica-Bold", fontSize=10.5, spaceAfter=2
    ))
    styles.add(ParagraphStyle(
        name="BulletText", fontName="Helvetica", fontSize=10, leading=14, alignment=TA_LEFT
    ))
    styles.add(ParagraphStyle(
        name="BodyText2", fontName="Helvetica", fontSize=10, leading=14
    ))
    return styles


def synthesize_resume(role_tag: str, raw_material: dict) -> dict:
    """One LLM call: turn raw material into a tailored resume, not a copy of an old one."""
    if gemini is None:
        raise RuntimeError("GEMINI_API_KEY is not configured. Set it in AWS Secrets Manager or as an environment variable.")

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
    Education: {json.dumps(raw_material.get('education', []), default=str)}
    Career goal: {raw_material['goal']}

    Instructions:
    - Select and reframe ONLY the projects/skills genuinely relevant to {role_tag}.
    - Rewrite project descriptions as resume bullet points emphasizing impact, using the role's likely priorities
    (e.g. Software Engineer → system design, code quality, scalability; ML Engineer → modeling, data pipelines).
    - Group experience by employer/company where the source material distinguishes them — do not merge multiple
    employers into one generic entry.
    - Include a "dates" field per experience entry only if a timeframe is mentioned in the source material; use
    "Present" for an ongoing role with no end date given. Omit the field entirely if no timeframe exists in
    memory — never invent one.
    - Do not fabricate employers, dates, or metrics not implied by the source material.
    - Do not repeat the same skill twice in the skills list.
    - Output JSON only, matching this shape:
    {{
    "summary": "...",
    "experience": [{{"title": "...", "dates": "...", "bullets": ["...", "..."]}}],
    "education": [{{"title": "...", "dates": "..."}}],
    "skills": ["..."]
    }}
    """
    resp = gemini.models.generate_content(model="gemini-3.5-flash-lite", contents=prompt)
    text = resp.text.strip().removeprefix("```json").removesuffix("```").strip()
    return json.loads(text)


async def generate_pdf_resume(session, db, role_tag: str):
    raw_material = await gather_raw_material(session.user_id, role_tag, db, embed_fn)

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

    artifact_id = str(uuid.uuid4())
    store_artifact_url(artifact_id, pdf_url)

    return {
        "status": "success",
        "message": f"PDF resume generated for {role_tag}.",
        "artifact_id": artifact_id,
        "resume_id": resume["id"],
    }


def render_pdf(role_tag: str, content: dict, user_id: str, bio: dict = None) -> str:
    bio = bio or {}
    styles = build_styles()
    buffer = BytesIO()

    doc = SimpleDocTemplate(
        buffer, pagesize=letter,
        topMargin=0.6 * inch, bottomMargin=0.6 * inch,
        leftMargin=0.7 * inch, rightMargin=0.7 * inch,
    )

    story = []

    # --- Header: name, contact, links ---
    if bio.get("name"):
        story.append(Paragraph(bio["name"], styles["NameHeader"]))

    contact_parts = [p for p in [bio.get("email"), bio.get("phone"), bio.get("location")] if p]
    if contact_parts:
        story.append(Paragraph(" | ".join(contact_parts), styles["ContactLine"]))

    links = bio.get("other_links") or []
    if links:
        story.append(Paragraph(" | ".join(links), styles["ContactLine"]))

    story.append(Paragraph(f"{role_tag}", styles["SectionHeader"]))

    # --- Summary ---
    if content.get("summary"):
        story.append(Paragraph(content["summary"], styles["BodyText2"]))
        story.append(Spacer(1, 10))

    # --- Experience ---
    if content.get("experience"):
        story.append(Paragraph("Experience", styles["SectionHeader"]))
        for exp in content["experience"]:
            title_line = exp.get("title", "")
            if exp.get("dates"):
                title_line += f"  ({exp['dates']})"
            story.append(Paragraph(title_line, styles["JobTitle"]))

            bullets = exp.get("bullets", [])
            if bullets:
                story.append(ListFlowable(
                    [ListItem(Paragraph(b, styles["BulletText"])) for b in bullets],
                    bulletType="bullet", start="•", leftIndent=14,
                ))
            story.append(Spacer(1, 8))

    # --- Education ---
    if content.get("education"):
        story.append(Paragraph("Education", styles["SectionHeader"]))
        for edu in content["education"]:
            if isinstance(edu, dict):
                title_line = edu.get("title", "")
                if edu.get("dates"):
                    title_line += f"  ({edu['dates']})"
            else:
                title_line = str(edu)
            story.append(Paragraph(title_line, styles["JobTitle"]))
        story.append(Spacer(1, 8))

    # --- Skills (deduplicated, order preserved) ---
    if content.get("skills"):
        unique_skills = list(dict.fromkeys(content["skills"]))
        story.append(Paragraph("Skills", styles["SectionHeader"]))
        story.append(Paragraph(", ".join(unique_skills), styles["BodyText2"]))

    doc.build(story)
    buffer.seek(0)

    s3 = get_s3_client()
    key = f"generated/{user_id}/{uuid.uuid4().hex[:12]}.pdf"
    s3.put_object(Bucket=BUCKET, Key=key, Body=buffer.read(), ContentType="application/pdf")
    return s3.generate_presigned_url("get_object", Params={"Bucket": BUCKET, "Key": key}, ExpiresIn=3600)