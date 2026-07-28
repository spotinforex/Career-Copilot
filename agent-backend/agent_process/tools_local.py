from google.genai import types
from utils.pdf_gen import generate_pdf_resume  


LOCAL_TOOL_DECLARATIONS = types.Tool(function_declarations=[
    types.FunctionDeclaration(
        name="generate_pdf_resume",
        description=(
            "Build and generate a downloadable PDF CV tailored to a target role. "
            "Synthesizes fresh resume content from the user's stored projects, skills, "
            "certifications, and career goal — even if no resume for this exact role "
            "exists yet. Use this whenever the user asks for a CV/resume PDF for a "
            "specific role, e.g. 'make me a resume for Software Engineer'."
        ),
        parameters={
            "type": "object",
            "properties": {
                "role_tag": {
                    "type": "string",
                    "description": "Target role, e.g. 'Software Engineer', 'ML Engineer', 'Data Engineer'"
                }
            },
            "required": ["role_tag"]
        }
    )
])

LOCAL_TOOL_HANDLERS = {
    "generate_pdf_resume": generate_pdf_resume,
}