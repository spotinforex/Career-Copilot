# CareerCopilot Extraction Job

## What this service does

The Extraction Job is the asynchronous background worker for CareerCopilot.
It processes completed chat and upload events, extracts structured facts, and stores them in CockroachDB for later retrieval.

## Core responsibilities

- Runs as an AWS Lambda function or serverless worker
- Receives extraction events from the SQS queue
- Extracts facts from chat and assistant message history
- Writes semantic memory and structured facts into CockroachDB
- Uses embeddings and memory deduplication for AI-friendly retrieval

## Architecture

This service is decoupled from the frontend and Agent Backend by SQS.
The Agent Backend publishes messages to SQS, and the Extraction Job consumes them asynchronously.

## Key files

- `main.py` — Lambda handler entrypoint and event processing
- `agent.py` — extraction agent orchestration and prompt logic
- `db_class.py` — CockroachDB/Postgres database helper methods
- SentenceTransformer usage for embedding text data

## Deployment notes

- Designed for AWS Lambda or similar serverless execution
- Reads secrets from AWS Secrets Manager (`career-copilot-prod` by default)
- Writes structured data and embeddings to CockroachDB
