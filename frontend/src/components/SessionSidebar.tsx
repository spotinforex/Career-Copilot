import React from 'react';
import { MessageSquare, Plus, Trash2, Clock, Sparkles } from 'lucide-react';
import { SessionInfo } from '../types';

interface SessionSidebarProps {
  sessions: SessionInfo[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const SessionSidebar: React.FC<SessionSidebarProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity"
      />

      {/* Drawer */}
      <div className="relative z-10 w-72 max-w-full bg-white h-full border-r border-slate-200 flex flex-col shadow-2xl animate-slideRight">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Conversation History</h3>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        {/* New Session Button */}
        <div className="p-3">
          <button
            onClick={() => {
              onNewSession();
              onClose();
            }}
            className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Start New Conversation
          </button>
        </div>

        {/* Session List */}
        <div className="flex-1 overflow-y-auto px-3 space-y-1.5 py-2">
          {sessions.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No previous conversations found.
            </div>
          ) : (
            sessions.map((session) => {
              const isActive = session.id === activeSessionId;
              return (
                <div
                  key={session.id}
                  onClick={() => {
                    onSelectSession(session.id);
                    onClose();
                  }}
                  className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs font-medium transition ${
                    isActive
                      ? 'bg-indigo-50 border border-indigo-200 text-indigo-900 shadow-2xs'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MessageSquare
                      className={`h-4 w-4 shrink-0 ${
                        isActive ? 'text-indigo-600' : 'text-slate-400'
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{session.title}</p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {new Date(session.updatedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {session.roleTag && ` • ${session.roleTag}`}
                      </p>
                    </div>
                  </div>

                  {sessions.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(session.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-1 rounded transition"
                      title="Delete session"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 text-center flex items-center justify-center gap-1.5">
          <Sparkles className="h-3 w-3 text-indigo-500" />
          <span>Sessions saved across agent calls</span>
        </div>
      </div>
    </div>
  );
};
