from google import genai
from google.genai import types
from agent_process.tools_local import LOCAL_TOOL_DECLARATIONS, LOCAL_TOOL_HANDLERS
from agent_process.mcp_bridge import mcp_tools_to_gemini
from utils.session import Session, get_artifact_url, delete_artifact
'''import os
from dotenv import load_dotenv
load_dotenv()'''
from utils.secret_manager import get_secret_value


def get_gemini_client():
    api_key = get_secret_value("GEMINI_API_KEY") or get_secret_value("GOOGLE_API_KEY")
    if not api_key:
        raise 
    return genai.Client(api_key=api_key)


client = get_gemini_client()

MAX_TOOL_ROUNDS = 20

def build_system_prompt(session: Session) -> str:
    goal = session.cached_context.get("goal")
    pinned = session.cached_context.get("pinned", [])
    bio = session.cached_context.get("bio")  

    goal_text = f"Target role: {goal['target_role']}" if goal else "No active career goal set yet."
    pinned_text = "\n".join(f"- {p['text_summary']}" for p in pinned) if pinned else "None yet."
    bio_text = (
        f"Name: {bio.get('name', 'Unknown')}\n"
        f"Location: {bio.get('location', 'Unknown')}\n"
        f"Email: {bio.get('email', 'Unknown')}"
    ) if bio else "No bio information on file yet."

    return f"""You are CareerCopilot, a career assistant with persistent memory of this user's
    professional background — resumes, projects, skills, certifications, and applications.

    The current user's database ID is: {session.user_id}
    User bio:
    {bio_text}
    Known context for this user:
    {goal_text}
    Pinned memories:
    {pinned_text}
    You have tools to:
    - Query the user's stored memory (bio_data, resumes, projects, skills, applications) via database tools. Only read-only tools are available to you, and under no circumstances should you write to the database directly.
    - Generate a tailored PDF resume for a specific target role

    Guidelines:
    - Don't fabricate details about the user's experience — only use what's actually in their memory.
    - If asked to build or update a resume, prefer the generate_pdf_resume tool rather than describing one in plain text.
    - Never query information_schema, pg_catalog, or any other system/metadata schema directly. If you need to know a table's structure, use the get_table_schema or list_tables tools instead of writing raw SQL against system catalogs.
    - Never SELECT the embedding column from memory_embeddings, and avoid SELECT * on that table specifically — the embedding vectors are large and will exceed response size limits. Select only the columns you actually need (e.g. source_table, source_id, memory_type, text_summary, is_pinned), never embedding itself.
    - If memory doesn't have enough information to answer confidently, say so and ask what's missing rather than guessing.
    - Always include a reasonable LIMIT on any query that isn't already scoped to a single row.
    - Be conversational and warm, like a knowledgeable friend who happens to know this person's career history well — not a form-filling assistant. Use natural phrasing, acknowledge what the user says before diving into tool calls, and feel free to ask a clarifying question if it helps you help them better.
    - Stay concise even while being conversational — friendly doesn't mean padded. Get to the point, just don't sound robotic doing it.
    - If Users as if they can upload their resumes, tell them yes they can go ahead and upload using the upload button.
    - If the user is just chatting, catching up, or asking something that isn't really about their career data, respond naturally rather than forcing it toward a tool call or a career topic.
    - When generate_pdf_resume succeeds, just confirm it's ready in a natural sentence (e.g. "Your Software Engineer resume is ready!") — a download link is attached automatically after your response, so never write out a URL yourself.

    Critical: on greetings or small talk ("hi", "hello", "hey", "how's it going") — just greet them back warmly and ask what they'd like help with. Do NOT check their memory, call any tools, or volunteer information about what is or isn't in their profile unless they've actually asked something that requires it. Never open with "I noticed you don't have..." or similar — an empty or incomplete profile is only relevant once the user asks a question it would actually affect, not something to lead with unprompted.
    """

async def run_agent_turn(user_message: str, session: Session, mcp, db):
    mcp_tools_list = await mcp.list_tools()
    mcp_tool_names = {t.name for t in mcp_tools_list}
    gemini_mcp_tool = mcp_tools_to_gemini(mcp_tools_list)
    all_tools = [gemini_mcp_tool, LOCAL_TOOL_DECLARATIONS]
    system_prompt = build_system_prompt(session)

    contents = [
        types.Content(role=turn["role"], parts=[types.Part(text=turn["content"])])
        for turn in session.history
    ]
    contents.append(types.Content(role="user", parts=[types.Part(text=user_message)]))

    session.add_turn("user", user_message)
    db.save_conversation_turn(session.user_id, session.session_id, "user", user_message)

    pending_artifact_ids = []  # collected across this turn's tool calls
    rounds = 0

    if client is None:
        raise RuntimeError("GEMINI_API_KEY is not configured. Set it in AWS Secrets Manager or as an environment variable.")

    while True:
        if rounds >= MAX_TOOL_ROUNDS:
            fallback = "I wasn't able to complete that after several attempts — could you rephrase or simplify the request?"
            session.add_turn("model", fallback)
            db.save_conversation_turn(session.user_id, session.session_id, "assistant", fallback)
            return fallback

        response = client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=contents,
            config=types.GenerateContentConfig(tools=all_tools, system_instruction=system_prompt)
        )
        candidate = response.candidates[0]
        contents.append(candidate.content)

        function_calls = [p.function_call for p in candidate.content.parts if p.function_call]

        if not function_calls:
            final_text = "".join(p.text for p in candidate.content.parts if p.text)

            # attach any generated download links AFTER the LLM's text is finalized —
            # never let the model see or reproduce the raw URL itself
            for artifact_id in pending_artifact_ids:
                url = get_artifact_url(artifact_id)
                if url:
                    final_text += f"\n\n[Download your resume PDF]({url})"
                    delete_artifact(artifact_id)

            session.add_turn("model", final_text)
            db.save_conversation_turn(session.user_id, session.session_id, "assistant", final_text)
            return final_text

        response_parts = []
        for fc in function_calls:
            args = dict(fc.args)

            if fc.name in LOCAL_TOOL_HANDLERS:
                result = await LOCAL_TOOL_HANDLERS[fc.name](session=session, db=db, **args)

                # capture the artifact_id locally, then strip it before the LLM ever sees it
                if "artifact_id" in result:
                    pending_artifact_ids.append(result["artifact_id"])
                    result = {k: v for k, v in result.items() if k != "artifact_id"}

            elif fc.name in mcp_tool_names:
                args.pop("cluster_id", None)
                result = await mcp.call_tool(fc.name, args)
            else:
                result = {"error": f"unknown tool {fc.name}"}

            response_parts.append(types.Part(
                function_response=types.FunctionResponse(name=fc.name, response={"content": str(result)})
            ))

        contents.append(types.Content(role="user", parts=response_parts))
        rounds += 1

