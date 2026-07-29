from google import genai
from google.genai import types
from agent_process.tools_local import LOCAL_TOOL_DECLARATIONS, LOCAL_TOOL_HANDLERS
from agent_process.mcp_bridge import mcp_tools_to_gemini
from utils.session import Session
import os
from dotenv import load_dotenv
load_dotenv()


client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

MAX_TOOL_ROUNDS = 20

def build_system_prompt(session: Session) -> str:
    goal = session.cached_context.get("goal")
    pinned = session.cached_context.get("pinned", [])

    goal_text = f"Target role: {goal['target_role']}" if goal else "No active career goal set yet."
    pinned_text = "\n".join(f"- {p['text_summary']}" for p in pinned) if pinned else "None yet."

    return f"""You are CareerCopilot, a career assistant with persistent memory of this user's
    professional background — resumes, projects, skills, certifications, and applications.

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
    - If memory doesn't have enough information to answer confidently, say so and ask what's missing rather than guessing.
    - Be conversational and warm, like a knowledgeable friend who happens to know this person's career history well — not a form-filling assistant. Use natural phrasing, acknowledge what the user says before diving into tool calls, and feel free to ask a clarifying question if it helps you help them better.
    - Stay concise even while being conversational — friendly doesn't mean padded. Get to the point, just don't sound robotic doing it.
    - If Users as if they can upload their resumes, tell them yes they can go ahead and upload using the upload button.
    - If the user is just chatting, catching up, or asking something that isn't really about their career data, respond naturally rather than forcing it toward a tool call or a career topic.

    Critical: on greetings or small talk ("hi", "hello", "hey", "how's it going") — just greet them back warmly and ask what they'd like help with. Do NOT check their memory, call any tools, or volunteer information about what is or isn't in their profile unless they've actually asked something that requires it. Never open with "I noticed you don't have..." or similar — an empty or incomplete profile is only relevant once the user asks a question it would actually affect, not something to lead with unprompted.
    """

async def run_agent_turn(user_message: str, session: Session, mcp, db):
    mcp_tools_list = await mcp.list_tools()
    mcp_tool_names = {t.name for t in mcp_tools_list}
    gemini_mcp_tool = mcp_tools_to_gemini(mcp_tools_list)

    all_tools = [gemini_mcp_tool, LOCAL_TOOL_DECLARATIONS]
    system_prompt = build_system_prompt(session)  # built once per turn, uses cached_context

    contents = [
        types.Content(role=turn["role"], parts=[types.Part(text=turn["content"])])
        for turn in session.history
    ]
    contents.append(types.Content(role="user", parts=[types.Part(text=user_message)]))

    session.add_turn("user", user_message)
    db.save_conversation_turn(session.user_id, session.session_id, "user", user_message)

    rounds = 0
    while True:
        if rounds >= MAX_TOOL_ROUNDS:
            fallback = "I wasn't able to complete that after several attempts — could you rephrase or simplify the request?"
            session.add_turn("model", fallback)
            db.save_conversation_turn(session.user_id, session.session_id, "assistant", fallback)
            return fallback

        response = client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=contents,
            config=types.GenerateContentConfig(
                tools=all_tools,
                system_instruction=system_prompt,
            )
        )
        candidate = response.candidates[0]
        contents.append(candidate.content)

        function_calls = [p.function_call for p in candidate.content.parts if p.function_call]

        if not function_calls:
            final_text = "".join(p.text for p in candidate.content.parts if p.text)
            session.add_turn("model", final_text)
            db.save_conversation_turn(session.user_id, session.session_id, "assistant", final_text)
            return final_text

        response_parts = []
        for fc in function_calls:
            args = dict(fc.args)
            if fc.name in LOCAL_TOOL_HANDLERS:
                result = await LOCAL_TOOL_HANDLERS[fc.name](session=session, db=db, **args)
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

