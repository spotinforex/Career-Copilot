# CareerCopilot Agent Backend

## What this service does

The Agent Backend is the central user-facing microservice in CareerCopilot.
It handles authenticated frontend requests, drives the conversational agent, and coordinates database access.

## Core responsibilities

- Exposes the live chat API and upload API for the frontend
- Validates Clerk JWT tokens and resolves user identities
- Uses CockroachDB directly for application data and session state
- Uses CockroachDB MCP for AI-driven semantic retrieval and agent memory
- Publishes extraction tasks to SQS for asynchronous processing
- Consumes background extraction results from SQS via a separate worker path

## Architecture

This service owns the live request path and serves as the frontend’s direct backend.
It connects to CockroachDB through both:

1. Direct Postgres access for resumes, history, sessions, and structured user data
2. CockroachDB MCP for semantic AI access and agent context

The Agent Backend also sends extraction jobs into the SQS queue, decoupling background processing from realtime UX.

## Key files

- `main.py` — FastAPI entrypoint and route definitions
- `agent_process/agent_loop.py` — agent orchestration and response generation
- `database/db.py` — direct CockroachDB/Postgres database layer
- `database/mcp_config.py` — CockroachDB MCP client configuration
- `utils/upload.py` — upload/resume ingestion logic
- `utils/sqs_connector.py` — SQS producer flow
- `utils/session.py` — user session management

## Deployment notes

- Built to run as an AWS Lambda-compatible FastAPI app using `Mangum`
- Requires secrets for Clerk auth, database credentials, MCP auth, and SQS configuration
- The frontend communicates with this service for live chat and upload operations
