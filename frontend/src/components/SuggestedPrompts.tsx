import React from 'react';
import { Sparkles, FileText, MessageSquare, Compass } from 'lucide-react';

interface SuggestedPromptsProps {
  onSelectPrompt: (promptText: string) => void;
  activeRoleTag: string;
}

export const SuggestedPrompts: React.FC<SuggestedPromptsProps> = ({
  onSelectPrompt,
  activeRoleTag,
}) => {
  const prompts = [
    {
      icon: FileText,
      text: `Tailor my profile for a ${activeRoleTag} role`,
    },
    {
      icon: MessageSquare,
      text: `Run a mock technical interview for ${activeRoleTag}`,
    },
    {
      icon: Compass,
      text: `Suggest 2 high-impact portfolio projects`,
    },
  ];

  return (
    <div className="flex flex-col items-center gap-2 py-1 animate-fadeIn">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
        <Sparkles className="h-3 w-3 text-indigo-500" />
        <span>Suggested Actions</span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl">
        {prompts.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={() => onSelectPrompt(item.text)}
              className="group flex items-center gap-2 px-3.5 py-1.5 bg-white/95 hover:bg-indigo-50/90 text-slate-700 hover:text-indigo-700 border border-slate-200/90 hover:border-indigo-300 rounded-full text-xs font-medium shadow-sm hover:shadow-md backdrop-blur-md transition-all duration-200 active:scale-95 cursor-pointer"
            >
              <Icon className="h-3.5 w-3.5 text-indigo-500 group-hover:text-indigo-600 shrink-0" />
              <span className="truncate max-w-[280px]">{item.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

