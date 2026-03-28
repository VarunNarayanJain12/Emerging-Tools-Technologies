import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2, Bot, ShieldCheck } from 'lucide-react';
import { gsap } from 'gsap';
import { riskService } from '@/services/riskService';
import { ExplainRiskResponse } from '@/types';

interface AskAIModalProps {
  studentId: string;
  studentName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const AskAIModal: React.FC<AskAIModalProps> = ({
  studentId,
  studentName,
  isOpen,
  onClose,
}) => {
  const [question, setQuestion] = useState("Why is this student at risk and what should I do?");
  const [explanation, setExplanation] = useState<string | null>(null);
  const [policiesUsed, setPoliciesUsed] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const modalRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const fetchExplanation = async (q: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await riskService.explainRisk({
        student_id: studentId,
        question: q,
      });
      setExplanation(response.explanation);
      setPoliciesUsed(response.policies_used);
    } catch (err: any) {
      console.error('AskAI error:', err);
      setError(err.message || "Failed to get AI explanation. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Auto-submit on open
      fetchExplanation(question);
      
      // Animations
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      gsap.fromTo(modalRef.current, 
        { opacity: 0, scale: 0.9, y: 20 }, 
        { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: "back.out(1.7)" }
      );
    } else {
      // Reset state on close
      setExplanation(null);
      setPoliciesUsed([]);
      setError(null);
      setQuestion("Why is this student at risk and what should I do?");
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim() && !isLoading) {
      fetchExplanation(question);
    }
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
        className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
              <Bot className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI Risk Analysis</h3>
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

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-4 text-center">
              <Loader2 className="h-10 w-10 text-orange-500 animate-spin" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">Generating intelligent insights...</p>
            </div>
          ) : error ? (
            <div className="py-8 text-center space-y-4">
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl inline-block">
                <X className="h-8 w-8" />
              </div>
              <p className="text-gray-800 dark:text-gray-200">{error}</p>
              <button 
                onClick={() => fetchExplanation(question)}
                className="px-6 py-2 bg-orange-500 text-white rounded-full font-semibold hover:bg-orange-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : explanation ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="prose prose-orange dark:prose-invert max-w-none">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {explanation}
                </p>
              </div>

              {policiesUsed.length > 0 && (
                <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Policies Referenced:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {policiesUsed.map((policy, idx) => (
                      <span 
                        key={idx}
                        className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] font-bold rounded-lg border border-gray-200 dark:border-gray-700"
                      >
                        {policy}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer / Input */}
        <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
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
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-3 text-center">
            AI can make mistakes. Verify critical information with institutional policies.
          </p>
        </div>
      </div>
    </div>
  );
};
