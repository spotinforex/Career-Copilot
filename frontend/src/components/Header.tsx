import React, { useState } from 'react';
import { History, Bot, Upload, Layers, RefreshCw, PanelRightOpen, PanelRightClose, LogOut, MessageSquare, FileText, User, Plus } from 'lucide-react';
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
  mobileTab?: 'chat' | 'resume';
  onMobileTabChange?: (tab: 'chat' | 'resume') => void;
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
  mobileTab = 'chat',
  onMobileTabChange,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  let clerk: any = null;
  let isSignedIn = false;
  try {
    clerk = useClerk();
    const userHook = useUser();
    isSignedIn = userHook.isSignedIn || false;
  } catch (e) {}

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-3 sm:px-4 py-2 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Left: Branding & Desktop History/New Chat */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs shrink-0">
            <Bot className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-tight">
              Career Copilot
            </h1>
            <p className="text-[10px] sm:text-[11px] text-slate-500 hidden sm:block">
              AI Career Assistant
            </p>
          </div>

          <div className="hidden md:flex items-center gap-1.5 ml-2">
            <button
              onClick={onOpenHistory}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200/70 px-2.5 py-1.5 rounded-lg transition"
              title="Conversation History"
            >
              <History className="h-3.5 w-3.5 text-slate-500" />
              <span>History ({sessionsCount})</span>
            </button>
            <button
              onClick={onNewSession}
              className="flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1.5 rounded-lg transition"
            >
              <Plus className="h-3.5 w-3.5 text-indigo-600" />
              <span>New Chat</span>
            </button>
          </div>
        </div>

        {/* Center: Target Role & Connection Dot (Desktop & Tablet) */}
        <div className="hidden md:flex items-center gap-2 min-w-0 flex-1 justify-center max-w-sm">
          <div className="flex items-center gap-1.5 bg-slate-100/90 px-2.5 py-1 rounded-lg border border-slate-200/70 min-w-0">
            <Layers className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="text-xs font-medium text-slate-500 hidden lg:block">Target:</span>
            <input
              type="text"
              value={activeRoleTag}
              onChange={(e) => onRoleTagChange(e.target.value)}
              placeholder="Target Role..."
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-400 rounded px-1.5 py-0.5 w-32 sm:w-40 transition truncate"
            />
          </div>

          {/* Connection Status Dot */}
          <button
            onClick={onRefreshHealth}
            title={isBackendOnline ? 'API Connected (Click to re-check)' : 'Offline Mode (Click to re-check)'}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-200 text-xs font-medium hover:bg-slate-50 transition shrink-0"
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
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Mobile History Button */}
          <button
            onClick={onOpenHistory}
            className="md:hidden p-1.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
            title="Conversation History"
          >
            <History className="h-4 w-4" />
          </button>

          {/* Mobile New Chat Button */}
          <button
            onClick={onNewSession}
            className="md:hidden flex items-center gap-1 px-2 py-1.5 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 rounded-lg transition font-semibold text-xs cursor-pointer"
            title="Start New Chat"
          >
            <Plus className="h-4 w-4 text-indigo-600" />
            <span className="text-[11px] font-bold">New</span>
          </button>

          {/* Upload Resume Button */}
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg shadow-xs transition active:scale-95"
          >
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Upload Resume</span>
            <span className="sm:hidden text-xs">Upload</span>
          </button>

          {/* Toggle Resume Panel (Desktop Only) */}
          <button
            onClick={onToggleResumePanel}
            title={showResumePanel ? 'Hide Resume Workspace' : 'Show Resume Workspace'}
            className={`hidden md:flex p-1.5 rounded-lg border transition ${
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

          {/* User Authentication Status / Profile Menu */}
          <div className="pl-1 border-l border-slate-200 ml-0.5 flex items-center relative">
            {isSignedIn ? (
              <UserButton />
            ) : currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/80 px-2 py-1 rounded-lg transition cursor-pointer"
                  title={currentUser.email}
                >
                  <div className="h-6 w-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold text-slate-700 hidden lg:inline max-w-[100px] truncate">
                    {currentUser.name}
                  </span>
                </button>

                {/* User Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-2 px-3 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
                    <div className="pb-2 border-b border-slate-100 mb-1">
                      <p className="font-bold text-slate-800 truncate">{currentUser.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onSignOut();
                      }}
                      className="w-full flex items-center gap-2 text-rose-600 hover:bg-rose-50 px-2 py-1.5 rounded-lg transition font-medium cursor-pointer"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Mobile Sub-Header Toolbar (Target Role, Status & Tab Switcher) */}
      <div className="flex md:hidden items-center justify-between border-t border-slate-200/80 pt-2 mt-2 gap-2 max-w-7xl mx-auto">
        {/* Target Role Input Pill */}
        <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200/80 flex-1 min-w-0">
          <Layers className="h-3 w-3 text-slate-400 shrink-0" />
          <input
            type="text"
            value={activeRoleTag}
            onChange={(e) => onRoleTagChange(e.target.value)}
            placeholder="Target Role..."
            className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-full truncate"
          />
        </div>

        {/* Health dot */}
        <button
          onClick={onRefreshHealth}
          title={isBackendOnline ? 'Connected' : 'Offline'}
          className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs shrink-0"
        >
          {isCheckingHealth ? (
            <RefreshCw className="h-3 w-3 animate-spin text-slate-400" />
          ) : isBackendOnline ? (
            <span className="w-2 h-2 rounded-full bg-emerald-500 block" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-amber-500 block" />
          )}
        </button>

        {/* View Switcher Tabs */}
        {onMobileTabChange && (
          <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg shrink-0">
            <button
              type="button"
              onClick={() => onMobileTabChange('chat')}
              className={`py-1 px-2.5 rounded-md text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer ${
                mobileTab === 'chat'
                  ? 'bg-indigo-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="h-3 w-3" />
              <span>Chat</span>
            </button>
            <button
              type="button"
              onClick={() => onMobileTabChange('resume')}
              className={`py-1 px-2.5 rounded-md text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer ${
                mobileTab === 'resume'
                  ? 'bg-indigo-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="h-3 w-3" />
              <span>Resume</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

