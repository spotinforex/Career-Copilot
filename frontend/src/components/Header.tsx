import React from 'react';
import { History, Bot, Upload, Layers, CheckCircle2, AlertCircle, RefreshCw, PanelRightOpen, PanelRightClose, User, LogOut } from 'lucide-react';
import { useClerk, useUser, UserButton } from '@clerk/clerk-react';

interface HeaderProps {
  isBackendOnline: boolean;
  isCheckingHealth: boolean;
  onRefreshHealth: () => void;
  onOpenUpload: () => void;
  activeRoleTag: string;
  onRoleTagChange: (role: string) => void;
  showResumePanel: boolean;
  onToggleResumePanel: () => void;
  onNewSession: () => void;
  onOpenHistory: () => void;
  sessionsCount: number;
  currentUser: { email: string; name: string } | null;
  onSignOut: () => void;
}

export const ROLE_TAGS = [
  'Software Engineer',
  'Machine Learning',
  'Data Scientist',
  'Full Stack Developer',
  'Backend Developer',
  'Frontend Developer',
  'Product Manager',
  'DevOps / Cloud',
];

export const Header: React.FC<HeaderProps> = ({
  isBackendOnline,
  isCheckingHealth,
  onRefreshHealth,
  onOpenUpload,
  activeRoleTag,
  onRoleTagChange,
  showResumePanel,
  onToggleResumePanel,
  onNewSession,
  onOpenHistory,
  sessionsCount,
  currentUser,
  onSignOut,
}) => {
  let clerk: any = null;
  let isSignedIn = false;
  let user: any = null;
  try {
    clerk = useClerk();
    const userHook = useUser();
    isSignedIn = userHook.isSignedIn;
    user = userHook.user;
  } catch (e) {}

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-2.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Branding & History */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
              Career Copilot
            </h1>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              AI Career Assistant
            </p>
          </div>

          <button
            onClick={onOpenHistory}
            className="ml-2 hidden sm:flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200/70 px-2.5 py-1.5 rounded-lg transition"
            title="Conversation History"
          >
            <History className="h-3.5 w-3.5 text-slate-500" />
            <span>History ({sessionsCount})</span>
          </button>
        </div>

        {/* Center: Target Role & Health */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-100/90 px-2 py-1 rounded-lg border border-slate-200/70">
            <Layers className="h-3.5 w-3.5 text-slate-400 hidden md:block" />
            <span className="text-xs font-medium text-slate-500 hidden lg:block">Target:</span>
            <input
              type="text"
              value={activeRoleTag}
              onChange={(e) => onRoleTagChange(e.target.value)}
              placeholder="Target Role..."
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-400 rounded px-1.5 py-0.5 w-28 sm:w-36 transition"
            />
          </div>

          {/* Connection Status Dot */}
          <button
            onClick={onRefreshHealth}
            title={isBackendOnline ? 'API Connected (Click to re-check)' : 'Offline Mode (Click to re-check)'}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-200 text-xs font-medium hover:bg-slate-50 transition"
          >
            {isCheckingHealth ? (
              <RefreshCw className="h-3 w-3 animate-spin text-slate-400" />
            ) : isBackendOnline ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            )}
            <span className="hidden xl:inline text-slate-600">
              {isBackendOnline ? 'Connected' : 'Offline'}
            </span>
          </button>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2">
          {/* History button for mobile */}
          <button
            onClick={onOpenHistory}
            className="sm:hidden p-1.5 text-slate-600 bg-slate-100 rounded-lg"
            title="History"
          >
            <History className="h-4 w-4" />
          </button>

          {/* New Session Button */}
          <button
            onClick={onNewSession}
            className="hidden sm:flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1.5 rounded-lg transition"
          >
            + New Chat
          </button>

          {/* Upload Resume Button */}
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xs transition active:scale-95"
          >
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Upload Resume</span>
            <span className="sm:hidden">Upload</span>
          </button>

          {/* Toggle Resume Panel */}
          <button
            onClick={onToggleResumePanel}
            title={showResumePanel ? 'Hide Resume Workspace' : 'Show Resume Workspace'}
            className={`p-1.5 rounded-lg border transition ${
              showResumePanel
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {showResumePanel ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRightOpen className="h-4 w-4" />
            )}
          </button>

          {/* User Authentication Status */}
          <div className="pl-1 border-l border-slate-200 ml-0.5 flex items-center gap-2">
            {isSignedIn ? (
              <UserButton />
            ) : currentUser ? (
              <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-lg">
                <div className="h-6 w-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-semibold text-slate-700 hidden md:inline">
                  {currentUser.name}
                </span>
                <button
                  onClick={onSignOut}
                  title="Sign Out"
                  className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
};
