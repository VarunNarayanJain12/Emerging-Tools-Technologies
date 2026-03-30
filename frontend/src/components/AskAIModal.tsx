import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2, Bot, ShieldCheck, Trash2, History } from 'lucide-react';
import { gsap } from 'gsap';
import { riskService } from '@/services/riskService';
import { ExplainRiskResponse } from '@/types';
import { useAuth } from '@/context/AuthContext';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  policiesUsed?: string[];
  isError?: boolean;
}

interface AskAIModalProps {
  studentId: string;
  studentName: string;
  isOpen: boolean;
  onClose: () => void;
  mentorUserId?: string; // Optional: falls back to user.id from AuthContext or "anon"
}

const DEFAULT_QUESTION = "Why is this student at risk and what should I do?";

export const AskAIModal: React.FC<AskAIModalProps> = ({
  studentId,
  studentName,
  isOpen,
  onClose,
  mentorUserId: mentorUserIdProp,
}) => {
  const { user } = useAuth();
  const mentorUserId = mentorUserIdProp ?? user?.id ?? 'anon';
  const storageKey = `ews_chat_${mentorUserId}_${studentId}`;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState(DEFAULT_QUESTION);
  const [isLoading, setIsLoading] = useState(false);
  const [showLoadedBadge, setShowLoadedBadge] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Persist messages to localStorage whenever they change ─────────────────
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [messages, storageKey]);

  // ── Scroll to bottom whenever messages update ──────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // ── On open: load history or auto-submit default question ─────────────────
  useEffect(() => {
    if (isOpen) {
      // Animate in
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      gsap.fromTo(modalRef.current,
        { opacity: 0, scale: 0.9, y: 20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: "back.out(1.7)" }
      );

      // Load or start fresh
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          const parsed: ChatMessage[] = JSON.parse(stored);
          if (parsed.length > 0) {
            setMessages(parsed);
            setQuestion('');
            setShowLoadedBadge(true);
            // Auto-hide badge after 3s
            setTimeout(() => setShowLoadedBadge(false), 3000);
            return;
          }
        } catch {
          // Corrupt storage — fall through to fresh start
        }
      }
      // No history: auto-submit default question
      setMessages([]);
      setQuestion(DEFAULT_QUESTION);
      submitQuestion(DEFAULT_QUESTION, []);
    } else {
      // Close: clear in-memory state (localStorage persists)
      setMessages([]);
      setQuestion(DEFAULT_QUESTION);
      setShowLoadedBadge(false);
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, storageKey]);

  // ── Core send function ─────────────────────────────────────────────────────
  const submitQuestion = async (q: string, history: ChatMessage[]) => {
    if (!q.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: q };
    const nextMessages = [...history, userMsg];
    setMessages(nextMessages);
    setQuestion('');
    setIsLoading(true);

    // Build conversation_history from prior messages (exclude the one we just added)
    const conversationHistory = history.map(m => ({ role: m.role, content: m.content }));

    try {
      const response = await riskService.explainRisk({
        student_id: studentId,
        question: q,
        conversation_history: conversationHistory,
      });

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: response.explanation,
        policiesUsed: response.policies_used,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('AskAI error:', err);
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: err.message || "Failed to get AI explanation. Please try again.",
        isError: true,
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim() && !isLoading) {
      submitQuestion(question, messages);
    }
  };

  // ── Clear history ──────────────────────────────────────────────────────────
  const handleClearHistory = () => {
    localStorage.removeItem(storageKey);
    setMessages([]);
    setQuestion(DEFAULT_QUESTION);
    setShowLoadedBadge(false);
    submitQuestion(DEFAULT_QUESTION, []);
  };

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800 flex flex-col"
        style={{ maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
              <Bot className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI Risk Analysis</h3>
                {showLoadedBadge && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-[10px] font-semibold rounded-full border border-orange-200 dark:border-orange-800 animate-in fade-in duration-300">
                    <History className="h-3 w-3" />
                    Last conversation loaded
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Consulting Academic Advisor AI for {studentName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Chat Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 min-h-0">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex flex-col gap-1 animate-in fade-in slide-in-from-bottom-2 duration-300 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              {/* Role label */}
              <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">
                {msg.role === 'user' ? 'You' : 'AI Advisor'}
              </span>

              {/* Bubble */}
              <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-orange-500 text-white rounded-tr-sm'
                  : msg.isError
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-tl-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-sm'
              }`}>
                {msg.content}
              </div>

              {/* Policies used (for assistant messages) */}
              {msg.role === 'assistant' && !msg.isError && msg.policiesUsed && msg.policiesUsed.length > 0 && (
                <div className="flex flex-wrap gap-1.5 max-w-[85%] pt-1">
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> Policies:
                  </span>
                  {msg.policiesUsed.map((policy, pIdx) => (
                    <span
                      key={pIdx}
                      className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] font-bold rounded-md border border-gray-200 dark:border-gray-700"
                    >
                      {policy}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex items-start gap-2 animate-in fade-in duration-200">
              <div className="px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm flex items-center gap-2">
                <Loader2 className="h-4 w-4 text-orange-500 animate-spin" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Generating intelligent insights...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Footer / Input */}
        <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
          <form onSubmit={handleSubmit} className="relative">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a follow-up question..."
              className="w-full pl-5 pr-14 py-4 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-2xl focus:border-orange-500 dark:focus:border-orange-500 outline-none transition-all text-sm dark:text-white"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !question.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-200 dark:shadow-none"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>

          <div className="flex items-center justify-between mt-3">
            <p className="text-[10px] text-gray-400 dark:text-gray-500">
              AI can make mistakes. Verify critical information with institutional policies.
            </p>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClearHistory}
                disabled={isLoading}
                className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="h-3 w-3" />
                Clear history
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
