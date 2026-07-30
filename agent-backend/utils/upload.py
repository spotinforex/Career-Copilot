import boto3
import uuid, json
import pdfplumber
import docx
from io import BytesIO

from google import genai
from utils.secret_manager import get_secret_value

def get_gemini_client():
    api_key = get_secret_value("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in secrets")
    return genai.Client(api_key=api_key)


client = get_gemini_client()

s3 = boto3.client("s3")
BUCKET = "careercopilot-uploads"

def extract_text(file_bytes: bytes, filename: str) -> str:
    if filename.lower().endswith(".pdf"):
        with pdfplumber.open(BytesIO(file_bytes)) as pdf:
            return "\n".join(page.extract_text() or "" for page in pdf.pages)
    elif filename.lower().endswith(".docx"):
        doc = docx.Document(BytesIO(file_bytes))
        return "\n".join(p.text for p in doc.paragraphs)
    else:
        return file_bytes.decode("utf-8", errors="ignore")

def structure_resume_text(raw_text: str) -> dict:
    resp = client.models.generate_content(
        model="gemini-3.5-flash-lite",
        contents=f"""Extract this resume into JSON with keys: Bio Info (list),summary, experience (list), education (list), skills (list).
    Return ONLY JSON, no markdown fences.

    Resume text:
    {raw_text}"""
        )
    return json.loads(resp.text)

async def handle_upload(user_id: str, file_bytes: bytes, filename: str, role_tag: str, db):
    # 1. store the original file
    key = f"uploads/{user_id}/{uuid.uuid4()}_{filename}"
    s3.put_object(Bucket=BUCKET, Key=key, Body=file_bytes)

    # 2. extract raw text
    raw_text = extract_text(file_bytes, filename)

    # 3. ask the LLM to structure it into your resume schema (one clean call, not the agent loop)
    structured = structure_resume_text(raw_text)  # separate LLM call, returns dict matching `resumes.content`

    # 4. save as a new resume version
    resume = db.save_new_resume_version(user_id, role_tag, structured)

    return {"s3_key": key, "resume_id": resume["id"], "content": structured}