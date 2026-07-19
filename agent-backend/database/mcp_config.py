from mcp.client.streamable_http import streamablehttp_client
from mcp import ClientSession

class CockroachMCPClient:
    def __init__(self, url: str, auth_token: str):
        self.url = url
        self.headers = {"Authorization": f"Bearer {auth_token}"}
        self._session = None
        self._ctx = None

    async def connect(self):
        self._ctx = streamablehttp_client(self.url, headers=self.headers)
        read, write, _ = await self._ctx.__aenter__()
        self._session = ClientSession(read, write)
        await self._session.__aenter__()
        await self._session.initialize()
        

    async def list_tools(self):
        result = await self._session.list_tools()
        return result.tools  # each has .name, .description, .inputSchema

    async def call_tool(self, name: str, arguments: dict):
        result = await self._session.call_tool(name, arguments)
        return result.content  # list of content blocks (text, etc.)

    async def close(self):
        await self._session.__aexit__(None, None, None)
        await self._ctx.__aexit__(None, None, None)

