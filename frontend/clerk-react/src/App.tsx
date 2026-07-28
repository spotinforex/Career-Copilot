import { useEffect, useState } from 'react'
import {
  SignInButton,
  SignUpButton,
  UserButton,
  useAuth,
} from '@clerk/react'
import './App.css'

const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

function App() {
  const { getToken, isSignedIn } = useAuth()
  const [chatMessage, setChatMessage] = useState('Hello from the frontend!')
  const [chatResponse, setChatResponse] = useState<string | null>(null)
  const [userResponse, setUserResponse] = useState<string | null>(null)
  const [uploadResponse, setUploadResponse] = useState<string | null>(null)
  const [roleTag, setRoleTag] = useState('software-engineer')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionMessage, setSessionMessage] = useState<string | null>(null)

  const getAuthHeaders = async () => {
    const token = await getToken()
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  }

  const handleEnsureUser = async () => {
    try {
      const res = await fetch(`${apiBase}/users`, {
        method: 'POST',
        headers: await getAuthHeaders(),
      })
      const data = await res.json()
      setUserResponse(JSON.stringify(data, null, 2))
    } catch (error) {
      setUserResponse(String(error))
    }
  }

  const handleChat = async () => {
    try {
      const res = await fetch(`${apiBase}/chat`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ message: chatMessage, session_id: sessionId ?? undefined }),
      })
      const data = await res.json()
      setChatResponse(JSON.stringify(data, null, 2))
      if (data.session_id) {
        setSessionId(data.session_id)
        setSessionMessage('Continuing session: ' + data.session_id)
      }
    } catch (error) {
      setChatResponse(String(error))
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadResponse('Choose a file first')
      return
    }

    try {
      const token = await getToken()
      const form = new FormData()
      form.append('role_tag', roleTag)
      form.append('file', selectedFile)

      if (sessionId) {
        form.append('session_id', sessionId)
      }

      const res = await fetch(`${apiBase}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      })
      const data = await res.json()
      setUploadResponse(JSON.stringify(data, null, 2))
      if (data.session_id) {
        setSessionId(data.session_id)
        setSessionMessage('Continuing session: ' + data.session_id)
      }
    } catch (error) {
      setUploadResponse(String(error))
    }
  }

  return (
    <div className="App" style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ marginBottom: 24 }}>
        {!isSignedIn ? (
          <div>
            <SignInButton />
            <SignUpButton />
          </div>
        ) : (
          <div>
            <UserButton />
          </div>
        )}
      </header>

      <main>
        {isSignedIn ? (
          <>
            <section style={{ marginBottom: 24 }}>
            <h2>Backend smoke tests</h2>
            <button onClick={handleEnsureUser}>Ensure DB User</button>
            <pre style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>{userResponse}</pre>
          </section>

          <section style={{ marginBottom: 24 }}>
            <h3>Session control</h3>
            <div style={{ marginBottom: 12 }}>
              <strong>Session ID:</strong> {sessionId ?? 'None yet'}
            </div>
            <button onClick={() => {
              setSessionId(null)
              setSessionMessage('Created a new session on next request')
            }}>
              New session
            </button>
            <div style={{ marginTop: 12, color: '#555' }}>{sessionMessage}</div>
          </section>

          <section style={{ marginBottom: 24 }}>
            <h3>Chat endpoint</h3>
            <textarea
              rows={4}
              style={{ width: '100%', marginBottom: 12 }}
              value={chatMessage}
              onChange={(event) => setChatMessage(event.target.value)}
            />
            <button onClick={handleChat}>Send Chat</button>
            <pre style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>{chatResponse}</pre>
          </section>

          <section>
            <h3>Upload endpoint</h3>
            <input
              type="text"
              value={roleTag}
              onChange={(event) => setRoleTag(event.target.value)}
              placeholder="Role tag"
              style={{ width: '100%', marginBottom: 12 }}
            />
            <input
              type="file"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              style={{ marginBottom: 12 }}
            />
            <button onClick={handleUpload}>Upload Resume</button>
            <pre style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>{uploadResponse}</pre>
          </section>
        </>
        ) : (
          <div>Please sign in to test the backend endpoints.</div>
        )}
      </main>
    </div>
  )
}

export default App