# CareerCopilot Frontend

## What this service does

The Frontend is the user-facing client application for CareerCopilot.
It provides the web UI for chat, resume uploads, session navigation, and document generation.

## Core responsibilities

- Authenticates users via Clerk
- Sends chat requests to the Agent Backend
- Uploads resume content and documents to the backend
- Displays assistant responses, session history, and suggested prompts
- Renders polished resume/workspace UI and PDF generation support

## Architecture

This is a React + Vite single-page application.
It communicates directly with the Agent Backend for live chat and upload interactions.

## Key files

- `src/App.tsx` — top-level application shell
- `src/components/ChatInterface.tsx` — chat UI and messaging flow
- `src/components/ResumeWorkspace.tsx` — resume and session workspace UI
- `src/services/api.ts` — HTTP client wrappers for backend APIs
- `src/utils/pdfGenerator.ts` — PDF resume export utilities

## Run locally

Use `npm install` then `npm run dev` to run the frontend locally on port 3000.
