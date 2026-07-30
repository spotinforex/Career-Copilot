import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, useUser, useClerk } from '@clerk/clerk-react';
import { Header } from './components/Header';
import { ChatInterface } from './components/ChatInterface';
import { ResumeWorkspace } from './components/ResumeWorkspace';
import { UploadModal } from './components/UploadModal';
import { SessionSidebar } from './components/SessionSidebar';
import { AuthPage } from './components/AuthPage';
import { checkBackendHealth, ensureUser, sendChatMessage, uploadResumeFile } from './services/api';
import { ChatMessage, UploadResponse, SessionInfo } from './types';
import { Bot } from 'lucide-react';

export default function App() {
  const [isBackendOnline, setIsBackendOnline] = useState<boolean>(true);
  const [isCheckingHealth, setIsCheckingHealth] = useState<boolean>(false);
  const [activeRoleTag, setActiveRoleTag] = useState<string>('Software Engineer');
  const [showResumePanel, setShowResumePanel] = useState<boolean>(true);
  const [mobileTab, setMobileTab] = useState<'chat' | 'resume'>('chat');
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isSessionSidebarOpen, setIsSessionSidebarOpen] = useState<boolean>(false);

  // Authentication state
  const [localUser, setLocalUser] = useState<{ email: string; name: string } | null>(() => {
    const saved = localStorage.getItem('career_copilot_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return null;
  });

  // Resume memory state - persisted in localStorage
  const [resumeData, setResumeData] = useState<UploadResponse | null>(() => {
    const saved = localStorage.getItem('career_copilot_resume_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return null;
  });

  // Save resumeData to localStorage whenever updated
  useEffect(() => {
    if (resumeData) {
      localStorage.setItem('career_copilot_resume_data', JSON.stringify(resumeData));
    } else {
      localStorage.removeItem('career_copilot_resume_data');
    }
  }, [resumeData]);

  // Sessions state
  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return localStorage.getItem('career_copilot_session') || '514a1ac1-1997-48f8-9ce6-7198aba211a3';
  });

  const [sessions, setSessions] = useState<SessionInfo[]>(() => {
    const saved = localStorage.getItem('career_copilot_sessions_list');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
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

  // Message history persistence helper
  const getSavedMessages = useCallback((sessionId: string | null, role: string): ChatMessage[] => {
    if (!sessionId) {
      return [
        {
          id: 'welcome-1',
          sender: 'assistant',
          text: `Hey there! 👋 How's it going? What can I help you with today?\n\nUpload your resume to hydrate Career Copilot's persistent memory for **${role}**, or ask any application questions!`,
          timestamp: new Date(),
        },
      ];
    }
    const saved = localStorage.getItem(`career_copilot_msgs_${sessionId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }));
        }
      } catch (e) {}
    }
    return [
      {
        id: `welcome-${sessionId}`,
        sender: 'assistant',
        text: `Hey there! 👋 How's it going? What can I help you with today?\n\nUpload your resume to hydrate Career Copilot's persistent memory for **${role}**, or ask any application questions!`,
        timestamp: new Date(),
      },
    ];
  }, []);

  // Chat message thread state
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const initialSession = localStorage.getItem('career_copilot_session') || '514a1ac1-1997-48f8-9ce6-7198aba211a3';
    return getSavedMessages(initialSession, activeRoleTag);
  });
  const [isSending, setIsSending] = useState<boolean>(false);

  // Save current messages to localStorage whenever messages update
  useEffect(() => {
    if (activeSessionId && messages.length > 0) {
      localStorage.setItem(`career_copilot_msgs_${activeSessionId}`, JSON.stringify(messages));
    }
  }, [messages, activeSessionId]);

  // Clerk Auth integration & token getter
  let getToken: (() => Promise<string | null>) | undefined;
  let isClerkLoaded = true;
  let isClerkSignedIn = false;
  let clerkUserInfo: { name: string; email: string } | null = null;
  let clerkSignOutFn: (() => Promise<void>) | undefined;

  try {
    const auth = useAuth();
    const userHook = useUser();
    const clerk = useClerk();
    getToken = auth.getToken;
    isClerkLoaded = userHook.isLoaded;
    isClerkSignedIn = userHook.isSignedIn || false;
    clerkSignOutFn = clerk.signOut;

    if (userHook.user) {
      clerkUserInfo = {
        name: userHook.user.fullName || userHook.user.firstName || 'User',
        email: userHook.user.primaryEmailAddress?.emailAddress || '',
      };
    }
  } catch (e) {
    // Clerk provider not mounted or unconfigured
  }

  // Sync Clerk authenticated user to local user & localStorage for reload persistence
  useEffect(() => {
    if (isClerkLoaded && isClerkSignedIn && clerkUserInfo) {
      setLocalUser(clerkUserInfo);
      localStorage.setItem('career_copilot_user', JSON.stringify(clerkUserInfo));
    }
  }, [isClerkLoaded, isClerkSignedIn, clerkUserInfo]);

  const isAuthenticated = (isClerkLoaded && isClerkSignedIn) || localUser !== null;
  const activeUser = clerkUserInfo || localUser;

  const handleLoginSuccess = (userObj: { email: string; name: string }) => {
    setLocalUser(userObj);
    localStorage.setItem('career_copilot_user', JSON.stringify(userObj));
  };

  const handleSignOut = () => {
    setLocalUser(null);
    localStorage.removeItem('career_copilot_user');
    if (clerkSignOutFn) {
      try {
        clerkSignOutFn();
      } catch (e) {}
    }
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

  // Save sessions list and activeSessionId to localStorage
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

    // Ensure resume panel is open & switch to resume tab on mobile
    setShowResumePanel(true);
    setMobileTab('resume');
  };

  // New Chat session
  const handleNewSession = () => {
    const newId = `session-${Date.now()}`;
    setActiveSessionId(newId);
    localStorage.setItem('career_copilot_session', newId);

    const newSessionsList = [
      {
        id: newId,
        title: `New Career Session (${activeRoleTag})`,
        updatedAt: new Date(),
        roleTag: activeRoleTag,
      },
      ...sessions,
    ];
    setSessions(newSessionsList);

    const newWelcome: ChatMessage[] = [
      {
        id: `welcome-${newId}`,
        sender: 'assistant',
        text: `Started a fresh career copilot session for target role: **${activeRoleTag}**.\n\nYour active resume profile is loaded in persistent memory. How can I assist with your application or interview prep today?`,
        timestamp: new Date(),
      },
    ];
    setMessages(newWelcome);
    localStorage.setItem(`career_copilot_msgs_${newId}`, JSON.stringify(newWelcome));
  };

  // Select session
  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    localStorage.setItem('career_copilot_session', sessionId);
    const loaded = getSavedMessages(sessionId, activeRoleTag);
    setMessages(loaded);
  };

  // Delete session
  const handleDeleteSession = (sessionId: string) => {
    const updated = sessions.filter((s) => s.id !== sessionId);
    setSessions(updated);
    localStorage.removeItem(`career_copilot_msgs_${sessionId}`);
    if (activeSessionId === sessionId) {
      if (updated.length > 0) {
        handleSelectSession(updated[0].id);
      } else {
        handleNewSession();
      }
    }
  };

  // Render full-screen loader while Clerk initializes on initial load
  if (!isClerkLoaded) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center text-slate-100 font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg animate-pulse">
            <Bot className="h-6 w-6" />
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
            <span className="inline-block h-4 w-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <span>Restoring workspace session...</span>
          </div>
        </div>
      </div>
    );
  }

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
        mobileTab={mobileTab}
        onMobileTabChange={(tab) => setMobileTab(tab)}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Chat Interface - full width on mobile when tab is chat, flexible on desktop */}
        <div className={`flex-1 flex flex-col h-full overflow-hidden ${mobileTab === 'chat' ? 'flex' : 'hidden md:flex'}`}>
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            isSending={isSending}
            onOpenUpload={() => setIsUploadOpen(true)}
            activeRoleTag={activeRoleTag}
          />
        </div>

        {/* Collapsible Resume Memory Workspace Panel */}
        <div
          className={`w-full md:w-[380px] lg:w-[420px] shrink-0 h-full border-l border-slate-200 overflow-hidden bg-slate-50 ${
            mobileTab === 'resume'
              ? 'flex flex-col'
              : showResumePanel
              ? 'hidden md:flex md:flex-col'
              : 'hidden'
          }`}
        >
          <ResumeWorkspace
            resumeData={resumeData}
            onOpenUpload={() => setIsUploadOpen(true)}
            activeRoleTag={activeRoleTag}
          />
        </div>
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
