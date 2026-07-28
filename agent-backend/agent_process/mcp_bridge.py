
from google.genai import types

def mcp_tools_to_gemini(mcp_tools):
    declarations = []
    for t in mcp_tools:
        declarations.append(types.FunctionDeclaration(
            name=t.name,
            description=t.description or "",
            parameters=t.inputSchema
        ))
    return types.Tool(function_declarations=declarations)