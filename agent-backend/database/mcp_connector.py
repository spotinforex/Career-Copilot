import asyncio, os
from database.mcp_config import CockroachMCPClient
from dotenv import load_dotenv
import logging

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

load_dotenv() 

async def main():
    client = CockroachMCPClient(
        url=os.getenv("db_url"),
        auth_token=os.getenv("db_secret_key"),
    )
    logger.info(f"Connecting to database")
    await client.connect()
    logger.info("Successfully connected to database")

    tools = await client.list_tools()
    for t in tools:
        print(t.name, "-", t.description)

    result = await client.call_tool("some_tool_name", {"arg1": "value"})
    print(result)

    await client.close()

asyncio.run(main())