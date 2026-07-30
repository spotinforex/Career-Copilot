import React, { useState } from 'react';
import { Bot, Sparkles, ShieldCheck, FileText, Briefcase, X, UserPlus, LogIn, ArrowRight } from 'lucide-react';
import { SignIn, SignUp } from '@clerk/clerk-react';

interface AuthPageProps {
  onLoginSuccess: (user: { email: string; name: string }) => void;
}

export const AuthPage: React.FC<AuthPageProps> = () => {
  const [activeModal, setActiveModal] = useState<'signup' | 'signin' | null>(null);

  const handleOpenModal = (mode: 'signup' | 'signin') => {
    setActiveModal(mode);
  };

  const handleCloseModal = () => {
    setActiveModal(null);
  };

  const clerkAppearance = {
    elements: {
      rootBox: 'w-full flex justify-center',
      card: 'bg-slate-800/95 border border-slate-700/80 shadow-2xl rounded-2xl p-6 text-white backdrop-blur-md w-full max-w-md',
      headerTitle: 'text-white font-bold text-xl',
      headerSubtitle: 'text-slate-400 text-xs',
      socialButtonsBlockButton:
        'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-950 hover:text-white transition',
      socialButtonsBlockButtonText: 'text-slate-200 text-xs font-semibold',
      formButtonPrimary:
        'bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2.5 rounded-xl shadow-md transition',
      footerActionLink: 'text-indigo-400 hover:text-indigo-300 font-semibold text-xs',
      footerActionText: 'text-slate-400 text-xs',
      formFieldLabel: 'text-slate-300 font-semibold text-xs',
      formFieldInput:
        'bg-slate-900 border border-slate-700 text-white text-xs rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none py-2 px-3',
      dividerLine: 'bg-slate-700',
      dividerText: 'text-slate-400 text-xs',
      identityPreviewText: 'text-slate-300 text-xs',
      identityPreviewEditButton: 'text-indigo-400 hover:text-indigo-300 text-xs',
    },
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col font-sans text-slate-100 antialiased relative overflow-x-hidden">
      {/* Horizontal Top Navigation Bar */}
      <header className="w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-6 py-4 flex items-center justify-between z-20 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <Bot className="h-5 w-5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-extrabold text-white tracking-tight">Career Copilot</span>
            <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
              AI Powered
            </span>
          </div>
        </div>

        {/* Horizontal Action Header Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleOpenModal('signin')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 font-semibold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <LogIn className="h-3.5 w-3.5 text-slate-400" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenModal('signup')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-600/30 transition flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Sign Up</span>
          </button>
        </div>
      </header>

      {/* Main Horizontal Landscape Hero Section */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-12 flex flex-col justify-between space-y-12">
        {/* Landscape Banner / Headline */}
        <div className="text-center max-w-4xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-2">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>AI-Driven Career Acceleration Platform</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight tracking-tight">
            Supercharge your job search with AI-tailored guidance.
          </h1>
          <p className="text-slate-400 text-sm md:text-base leading-relaxed max-w-2xl mx-auto">
            Upload your PDF resume, target your dream role, and let your AI Career Copilot optimize your application, answer interview questions, and export custom PDFs instantly.
          </p>

          {/* Central CTA Buttons Bar */}
          <div className="pt-4 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => handleOpenModal('signup')}
              className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl shadow-xl shadow-indigo-600/30 transition flex items-center gap-2 cursor-pointer group"
            >
              <UserPlus className="h-4 w-4" />
              <span>Sign Up with Clerk</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              type="button"
              onClick={() => handleOpenModal('signin')}
              className="px-6 py-3.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 font-bold text-sm rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <LogIn className="h-4 w-4 text-slate-400" />
              <span>Sign In</span>
            </button>
          </div>
        </div>

        {/* Horizontal Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl mx-auto pt-4">
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800/90 hover:border-indigo-500/40 transition shadow-lg flex flex-col justify-between space-y-4">
            <div className="h-10 w-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white mb-1">PDF Resume Memory</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Extracts skills, work experience, and achievements directly from your CV to ground every response.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800/90 hover:border-emerald-500/40 transition shadow-lg flex flex-col justify-between space-y-4">
            <div className="h-10 w-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white mb-1">Role-Specific Tailoring</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Target Software Engineering, Data Science, Product Management, DevOps & more with custom tags.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800/90 hover:border-amber-500/40 transition shadow-lg flex flex-col justify-between space-y-4">
            <div className="h-10 w-10 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white mb-1">Instant Tailored PDF Exports</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Download formatted, ATS-friendly PDFs generated directly from AI recommendations and chats.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-800/80 py-4 px-6 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto">
        <span>&copy; {new Date().getFullYear()} Career Copilot. All rights reserved.</span>
        <span className="flex items-center gap-1.5 text-slate-400 font-medium">
          <ShieldCheck className="h-4 w-4 text-emerald-400" /> Authentication powered by Clerk Auth
        </span>
      </footer>

      {/* POPUP MODAL OVERLAY FOR CLERK SIGN UP / SIGN IN */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md flex flex-col items-center">
            {/* Modal Header Controls */}
            <div className="mb-3 flex items-center justify-between w-full bg-slate-800/90 p-2 rounded-xl border border-slate-700/80 shadow-lg">
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveModal('signup')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                    activeModal === 'signup'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sign Up
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal('signin')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                    activeModal === 'signin'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sign In
                </button>
              </div>

              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded-lg transition cursor-pointer"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Clerk Component Pop-up Container */}
            <div className="w-full flex justify-center max-h-[85vh] overflow-y-auto">
              {activeModal === 'signup' ? (
                <SignUp
                  routing="virtual"
                  signInUrl="#"
                  appearance={clerkAppearance}
                />
              ) : (
                <SignIn
                  routing="virtual"
                  signUpUrl="#"
                  appearance={clerkAppearance}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
