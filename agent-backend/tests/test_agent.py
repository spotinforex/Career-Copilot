import os
import asyncio
from dotenv import load_dotenv

load_dotenv()

from agent_process.agent_loop import run_agent_turn
from utils.session import Session
from database.db import CareerCopilotDB
from database.mcp_config import CockroachMCPClient

url = os.getenv("db_url")
pass_ = os.getenv("db_secret_key")
print("DEBUG: db_url:", url)
print("DEBUG: db_secret_key:", pass_)

async def main():
    db = CareerCopilotDB(os.getenv("DATABASE_URL")).connect()

    mcp = CockroachMCPClient(url,pass_)
    await mcp.connect()

    # get or create a real test user so user_id is an actual UUID
    test_user = db.fetch_one("users", where={"email": "test@example.com"})
    if not test_user:
        test_user = db.insert("users", {"email": "test@example.com"})

    session = Session(user_id=test_user["id"])
    prompts = ["Hello",
              "I am a software engineer with 5 years of experience in web development, specializing in Python and JavaScript. I have worked on various projects involving RESTful APIs, front-end frameworks like React, and back-end technologies such as Django and Node.js. I am looking to transition into a role that allows me to leverage my skills in cloud computing and DevOps practices."
              "Please summarize my experience and suggest a target role."]
    for prompt in prompts:
        response = await run_agent_turn(
            prompt,
            session,
            mcp,
            db,
        )
        print(response)

    await mcp.close()
    db.close()


if __name__ == "__main__":
    asyncio.run(main())