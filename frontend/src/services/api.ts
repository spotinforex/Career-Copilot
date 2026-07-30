import { ChatResponse, UploadResponse } from '../types';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://uuinkmcj5rso3z6cd6czfqrcyu0zanpg.lambda-url.us-east-2.on.aws';

async function getHeaders(token?: string | null): Promise<HeadersInit> {
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function checkBackendHealth(): Promise<{ status: string; online: boolean }> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (response.ok) {
      const data = await response.json();
      return { status: data.status || 'ok', online: true };
    }
    return { status: 'degraded', online: false };
  } catch (err) {
    console.warn('Backend health check failed:', err);
    return { status: 'offline', online: false };
  }
}

export async function ensureUser(token?: string | null): Promise<{ user_id: string; email: string } | null> {
  try {
    const headers = await getHeaders(token);
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });
    if (response.ok) {
      return await response.json();
    }
    console.warn('ensureUser responded with non-200:', response.status);
    return null;
  } catch (err) {
    console.warn('ensureUser request failed:', err);
    return null;
  }
}

export async function sendChatMessage(
  message: string,
  sessionId?: string | null,
  token?: string | null
): Promise<ChatResponse> {
  const headers = await getHeaders(token);
  const body: { message: string; session_id?: string } = { message };
  if (sessionId) {
    body.session_id = sessionId;
  }

  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Chat API error (${response.status}): ${errorText || response.statusText}`);
  }

  return await response.json();
}

export async function uploadResumeFile(
  file: File,
  roleTag: string,
  sessionId?: string | null,
  token?: string | null
): Promise<UploadResponse> {
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const formData = new FormData();
  formData.append('role_tag', roleTag);
  if (sessionId) {
    formData.append('session_id', sessionId);
  }
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Upload API error (${response.status}): ${errorText || response.statusText}`);
  }

  return await response.json();
}
