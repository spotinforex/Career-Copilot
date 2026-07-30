import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Bot, User, Paperclip, Download, Sparkles, Loader2, FileText, CornerDownLeft, Copy, Check, RotateCcw, ExternalLink } from 'lucide-react';
import { ChatMessage } from '../types';
import { SuggestedPrompts } from './SuggestedPrompts';
import { downloadPdfFromText, downloadPdfFromResumeData } from '../utils/pdfGenerator';

function extractPdfUrl(text: string): string | null {
  if (!text) return null;
  // Check for Markdown link pattern: [label](url)
  const markdownMatch = text.match(/\[.*?\]\((https?:\/\/[^\s\)]+)\)/i);
  if (markdownMatch && markdownMatch[1]) {
    return markdownMatch[1];
  }
  // Check for direct URL
  const plainUrlMatch = text.match(/(https?:\/\/[^\s\)]+(?:\.pdf|\/generated\/|\?X-Amz-)[^\s\)]*)/i);
  if (plainUrlMatch && plainUrlMatch[1]) {
    return plainUrlMatch[1];
  }
  return null;
}

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  isSending: boolean;
  onOpenUpload: () => void;
  activeRoleTag: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  isSending,
  onOpenUpload,
  activeRoleTag,
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRetry = (msgIndex: number) => {
    if (isSending) return;
    // Find preceding user message
    for (let i = msgIndex; i >= 0; i--) {
      if (messages[i].sender === 'user') {
        onSendMessage(messages[i].text);
        return;
      }
    }
    const lastUser = [...messages].reverse().find((m) => m.sender === 'user');
    if (lastUser) {
      onSendMessage(lastUser.text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!inputText.trim() || isSending) return;
    const msg = inputText;
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    await onSendMessage(msg);
  };

  const handleSelectPrompt = (promptText: string) => {
    setInputText(promptText);
    textareaRef.current?.focus();
  };

  // Adjust textarea height dynamically
  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/30 overflow-hidden relative">
      {/* Scrollable Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {/* Welcome Banner if messages are few */}
        {messages.length <= 1 && (
          <div className="max-w-2xl mx-auto my-4 p-6 bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl shadow-lg border border-indigo-800/50 space-y-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-300 border border-indigo-400/30">
                <Sparkles className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-bold tracking-tight">Career Copilot AI Engine</h2>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Your intelligent career partner powered by persistent session memory. Upload your resume to extract key experiences, tailor application materials for targeted roles, or run realistic technical interview simulations.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-indigo-950/80 border border-indigo-700/50 text-indigo-200 font-medium">
                🎯 Target Role: {activeRoleTag}
              </span>
              <button
                onClick={onOpenUpload}
                className="px-3 py-1 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition flex items-center gap-1.5 shadow-xs"
              >
                <Paperclip className="h-3 w-3" />
                Upload Resume
              </button>
            </div>
          </div>
        )}

        {/* Message Thread */}
        <div className="max-w-3xl mx-auto space-y-5">
          {messages.map((msg, idx) => {
            const isUser = msg.sender === 'user';
            const pdfUrl = !isUser ? extractPdfUrl(msg.text) : null;
            const isResumeReady =
              !isUser &&
              (Boolean(pdfUrl) ||
                Boolean(msg.resumeData) ||
                msg.text.includes('Download your resume') ||
                msg.text.includes('ready!') ||
                msg.text.toLowerCase().includes('.pdf') ||
                msg.text.toLowerCase().includes('download pdf') ||
                (msg.text.toLowerCase().includes('resume') && msg.text.includes('#')));

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start group`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold shadow-xs ${
                    isUser
                      ? 'bg-slate-900 text-white'
                      : 'bg-indigo-600 text-white'
                  }`}
                >
                  {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>

                {/* Bubble Container */}
                <div
                  className={`max-w-[85%] md:max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed transition-all shadow-xs ${
                    isUser
                      ? 'bg-slate-900 text-slate-100 rounded-tr-none'
                      : 'bg-white border border-slate-200/90 text-slate-900 rounded-tl-none'
                  }`}
                >
                  {/* Sender Header */}
                  <div className="flex items-center justify-between gap-4 pb-1.5 mb-1.5 border-b border-slate-100/10 text-[10px] opacity-70">
                    <span className="font-semibold">{isUser ? 'You' : 'Career Copilot'}</span>
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Message Content */}
                  {isUser ? (
                    <p className="whitespace-pre-wrap font-sans text-xs">{msg.text}</p>
                  ) : (
                    <div className="prose prose-xs max-w-none text-slate-800 leading-relaxed font-sans">
                      <ReactMarkdown
                        components={{
                          a: ({ href, children }) => (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800 underline decoration-indigo-300 hover:decoration-indigo-600 break-all"
                            >
                              <span>{children}</span>
                              <ExternalLink className="h-3 w-3 shrink-0" />
                            </a>
                          ),
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                  )}

                  {/* Special Card if PDF / Resume is ready */}
                  {isResumeReady && (
                    <div className="mt-3 p-3 bg-gradient-to-r from-emerald-50 to-indigo-50 border border-emerald-200/70 rounded-xl flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">Tailored Resume PDF</p>
                          <p className="text-[10px] text-slate-500">Formatted for {activeRoleTag}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (pdfUrl) {
                            window.open(pdfUrl, '_blank', 'noopener,noreferrer');
                          } else if (msg.resumeData) {
                            downloadPdfFromResumeData(msg.resumeData, activeRoleTag);
                          } else {
                            downloadPdfFromText(
                              msg.text,
                              `${activeRoleTag.replace(/\s+/g, '_')}_Resume.pdf`,
                              `Tailored ${activeRoleTag} Resume`
                            );
                          }
                        }}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download PDF</span>
                      </button>
                    </div>
                  )}

                  {/* Message Action Bar: Copy & Retry */}
                  <div
                    className={`mt-2.5 pt-1.5 flex items-center justify-end gap-3 border-t text-[11px] font-medium transition-opacity ${
                      isUser
                        ? 'border-slate-800 text-slate-400'
                        : 'border-slate-100 text-slate-400'
                    }`}
                  >
                    <button
                      onClick={() => handleCopy(msg.id, msg.text)}
                      className={`flex items-center gap-1 transition cursor-pointer ${
                        isUser ? 'hover:text-white' : 'hover:text-indigo-600 text-slate-400'
                      }`}
                      title="Copy message content"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-400" />
                          <span className="text-emerald-400 font-semibold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    {!isUser && (
                      <button
                        onClick={() => handleRetry(idx)}
                        disabled={isSending}
                        className="flex items-center gap-1 text-slate-400 hover:text-indigo-600 transition disabled:opacity-40 cursor-pointer"
                        title="Retry response"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Retry</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Thinking Spinner */}
          {isSending && (
            <div className="flex gap-3 items-start animate-pulse">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3 text-xs text-slate-500 flex items-center gap-2 shadow-xs">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                <span>Career Copilot is analyzing memory and formulating response...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Floating Suggested Prompts - Only show on fresh sessions before user sends messages */}
      {messages.length <= 1 && (
        <div className="px-4 md:px-6 shrink-0 max-w-3xl mx-auto w-full mb-2 z-10">
          <SuggestedPrompts onSelectPrompt={handleSelectPrompt} activeRoleTag={activeRoleTag} />
        </div>
      )}

      {/* Input Box Footer */}
      <div className="p-4 md:px-6 bg-white border-t border-slate-200 shrink-0">
        <div className="max-w-3xl mx-auto relative">
          <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white transition shadow-xs">
            {/* Attachment Button */}
            <button
              onClick={onOpenUpload}
              title="Upload Resume to Agent Memory"
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition shrink-0"
            >
              <Paperclip className="h-4 w-4" />
            </button>

            {/* Input Textarea */}
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              placeholder={`Ask Career Copilot anything about your CV, interview prep, or target role (${activeRoleTag})...`}
              rows={1}
              className="flex-1 bg-transparent text-xs text-slate-900 placeholder-slate-400 focus:outline-none resize-none py-2 px-1 max-h-40 font-sans"
            />

            {/* Send Button */}
            <button
              onClick={handleSubmit}
              disabled={!inputText.trim() || isSending}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl shadow-xs transition active:scale-95 shrink-0 flex items-center justify-center"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>

          <div className="mt-1.5 px-1 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <CornerDownLeft className="h-3 w-3" /> Press Enter to send, Shift+Enter for new line
            </span>
            <span>Target Role: <strong className="text-slate-600 font-semibold">{activeRoleTag}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
