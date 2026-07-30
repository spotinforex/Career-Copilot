import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { Header } from './components/Header';
import { ChatInterface } from './components/ChatInterface';
import { ResumeWorkspace } from './components/ResumeWorkspace';
import { UploadModal } from './components/UploadModal';
import { SessionSidebar } from './components/SessionSidebar';
import { AuthPage } from './components/AuthPage';
import { checkBackendHealth, ensureUser, sendChatMessage, uploadResumeFile } from './services/api';
import { initialSampleResume } from './data/sampleResume';
import { ChatMessage, UploadResponse, SessionInfo } from './types';
import { MessageSquare, Layers, Sparkles } from 'lucide-react';

export default function App() {
  const [isBackendOnline, setIsBackendOnline] = useState<boolean>(true);
  const [isCheckingHealth, setIsCheckingHealth] = useState<boolean>(false);
  const [activeRoleTag, setActiveRoleTag] = useState<string>('Software Engineer');
  const [showResumePanel, setShowResumePanel] = useState<boolean>(true);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isSessionSidebarOpen, setIsSessionSidebarOpen] = useState<boolean>(false);

  // Authentication gate state
  const [localUser, setLocalUser] = useState<{ email: string; name: string } | null>(() => {
    const saved = localStorage.getItem('career_copilot_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return null;
  });

  // Resume memory state - starts empty until user uploads a CV
  const [resumeData, setResumeData] = useState<UploadResponse | null>(null);

  // Sessions state
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    () => localStorage.getItem('career_copilot_session') || null
  );
  const [sessions, setSessions] = useState<SessionInfo[]>(() => {
    const saved = localStorage.getItem('career_copilot_sessions_list');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      {
        id: '514a1ac1-1997-48f8-9ce6-7198aba211a3',
        title: 'Career Guidance Session',
        updatedAt: new Date(),
        roleTag: 'Software Engineer',
      },
    ];
  });

  // Chat message thread state
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: "Hey there! 👋 How's it going? What can I help you with today?\n\nUpload your resume to hydrate Career Copilot's persistent memory with your experience, projects, and skills.",
      timestamp: new Date(),
    },
  ]);
  const [isSending, setIsSending] = useState<boolean>(false);

  // Clerk Auth token getter and User state
  let getToken: (() => Promise<string | null>) | undefined;
  let isClerkSignedIn = false;
  let clerkUserInfo: { name: string; email: string } | null = null;
  try {
    const auth = useAuth();
    const userHook = useUser();
    getToken = auth.getToken;
    isClerkSignedIn = userHook.isSignedIn || false;
    if (userHook.user) {
      clerkUserInfo = {
        name: userHook.user.fullName || userHook.user.firstName || 'User',
        email: userHook.user.primaryEmailAddress?.emailAddress || '',
      };
    }
  } catch (e) {
    // Clerk provider not mounted or unconfigured
  }

  const isAuthenticated = isClerkSignedIn || localUser !== null;
  const activeUser = clerkUserInfo || localUser;

  const handleLoginSuccess = (userObj: { email: string; name: string }) => {
    setLocalUser(userObj);
    localStorage.setItem('career_copilot_user', JSON.stringify(userObj));
  };

  const handleSignOut = () => {
    setLocalUser(null);
    localStorage.removeItem('career_copilot_user');
  };

  const fetchAuthToken = useCallback(async (): Promise<string | null> => {
    if (getToken) {
      try {
        return await getToken();
      } catch (err) {
        console.warn('Could not retrieve Clerk token:', err);
      }
    }
    return null;
  }, [getToken]);

  // Check health on mount
  const handleCheckHealth = useCallback(async () => {
    setIsCheckingHealth(true);
    const health = await checkBackendHealth();
    setIsBackendOnline(health.online);
    setIsCheckingHealth(false);
  }, []);

  useEffect(() => {
    handleCheckHealth();
  }, [handleCheckHealth]);

  // Ensure user registration on mount or auth token change
  useEffect(() => {
    (async () => {
      const token = await fetchAuthToken();
      if (token) {
        await ensureUser(token);
      }
    })();
  }, [fetchAuthToken]);

  // Save sessions to localStorage
  useEffect(() => {
    localStorage.setItem('career_copilot_sessions_list', JSON.stringify(sessions));
    if (activeSessionId) {
      localStorage.setItem('career_copilot_session', activeSessionId);
    }
  }, [sessions, activeSessionId]);

  // Send message handler
  const handleSendMessage = async (text: string) => {
    const userMsgId = `user-${Date.now()}`;
    const newMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMsg]);
    setIsSending(true);

    try {
      const token = await fetchAuthToken();
      const chatRes = await sendChatMessage(text, activeSessionId, token);

      if (chatRes.session_id && chatRes.session_id !== activeSessionId) {
        setActiveSessionId(chatRes.session_id);
        // Add to session list if new
        setSessions((prev) => {
          if (!prev.some((s) => s.id === chatRes.session_id)) {
            return [
              {
                id: chatRes.session_id,
                title: text.slice(0, 30) + (text.length > 30 ? '...' : ''),
                updatedAt: new Date(),
                roleTag: activeRoleTag,
              },
              ...prev,
            ];
          }
          return prev;
        });
      }

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: chatRes.response,
        timestamp: new Date(),
        session_id: chatRes.session_id,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      // Fallback assistant response
      const fallbackMsg: ChatMessage = {
        id: `assistant-err-${Date.now()}`,
        sender: 'assistant',
        text: `Something went wrong while processing your request. Please try again.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsSending(false);
    }
  };

  // Upload function wrapper
  const handleUploadResume = async (file: File, roleTag: string): Promise<UploadResponse> => {
    const token = await fetchAuthToken();
    const result = await uploadResumeFile(file, roleTag, activeSessionId, token);
    return result;
  };

  // Handle successful upload
  const handleUploadSuccess = (result: UploadResponse) => {
    setResumeData(result);

    // Append upload event & acknowledgment message to chat
    const uploadUserMsg: ChatMessage = {
      id: `user-up-${Date.now()}`,
      sender: 'user',
      text: `Uploaded resume for target role: ${activeRoleTag}`,
      timestamp: new Date(),
      isUploadAck: true,
    };

    const uploadAssistantMsg: ChatMessage = {
      id: `assistant-up-${Date.now()}`,
      sender: 'assistant',
      text: result.message || `Got your resume for ${activeRoleTag} — saved it to your profile.`,
      timestamp: new Date(),
      resumeData: result,
    };

    setMessages((prev) => [...prev, uploadUserMsg, uploadAssistantMsg]);

    // Ensure resume panel is open to display extracted memory
    setShowResumePanel(true);
  };

  // New Chat session
  const handleNewSession = () => {
    const newId = `session-${Date.now()}`;
    setActiveSessionId(newId);
    setSessions((prev) => [
      {
        id: newId,
        title: `New Career Session (${activeRoleTag})`,
        updatedAt: new Date(),
        roleTag: activeRoleTag,
      },
      ...prev,
    ]);
    setMessages([
      {
        id: `welcome-${newId}`,
        sender: 'assistant',
        text: `Started a fresh career copilot session for target role: **${activeRoleTag}**.\n\nYour active resume profile is loaded in persistent memory. How can I assist with your application or interview prep today?`,
        timestamp: new Date(),
      },
    ]);
  };

  // Select session
  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    const sessionItem = sessions.find((s) => s.id === sessionId);
    setMessages([
      {
        id: `session-switch-${Date.now()}`,
        sender: 'assistant',
        text: `Switched to session **${sessionItem?.title || sessionId}**.\n\nI have retrieved your agent memory context for ${sessionItem?.roleTag || activeRoleTag}. What would you like to review?`,
        timestamp: new Date(),
      },
    ]);
  };

  // Delete session
  const handleDeleteSession = (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      handleNewSession();
    }
  };

  if (!isAuthenticated) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-100 overflow-hidden font-sans text-slate-900 antialiased select-none">
      {/* Top Navigation Header */}
      <Header
        isBackendOnline={isBackendOnline}
        isCheckingHealth={isCheckingHealth}
        onRefreshHealth={handleCheckHealth}
        onOpenUpload={() => setIsUploadOpen(true)}
        activeRoleTag={activeRoleTag}
        onRoleTagChange={(role) => setActiveRoleTag(role)}
        showResumePanel={showResumePanel}
        onToggleResumePanel={() => setShowResumePanel(!showResumePanel)}
        onNewSession={handleNewSession}
        onOpenHistory={() => setIsSessionSidebarOpen(true)}
        sessionsCount={sessions.length}
        currentUser={activeUser}
        onSignOut={handleSignOut}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Interface */}
        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          isSending={isSending}
          onOpenUpload={() => setIsUploadOpen(true)}
          activeRoleTag={activeRoleTag}
        />

        {/* Collapsible Resume Memory Workspace Panel */}
        {showResumePanel && (
          <div className="w-full md:w-[380px] lg:w-[420px] shrink-0 h-full">
            <ResumeWorkspace
              resumeData={resumeData}
              onOpenUpload={() => setIsUploadOpen(true)}
              activeRoleTag={activeRoleTag}
            />
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleUploadSuccess}
        uploadFn={handleUploadResume}
        currentRoleTag={activeRoleTag}
      />

      {/* Session History Sidebar Drawer */}
      <SessionSidebar
        isOpen={isSessionSidebarOpen}
        onClose={() => setIsSessionSidebarOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
      />
    </div>
  );
}
