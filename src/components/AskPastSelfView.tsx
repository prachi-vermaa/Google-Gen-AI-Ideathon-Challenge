import React, { useState } from "react";
import { JournalInteraction, PastSelfCitation } from "../types";
import {
  History,
  Send,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  BookOpen,
  Calendar,
  Quote,
  Clock,
  ArrowRight,
} from "lucide-react";

interface AskPastSelfViewProps {
  interactions: JournalInteraction[];
  onOpenInteraction: (id: string) => void;
  userId: string;
}

interface QAPair {
  question: string;
  answer: string;
  hasEnoughInfo: boolean;
  citations: PastSelfCitation[];
  timestamp: number;
  modelUsed?: string;
}

const SAMPLE_QUESTIONS = [
  "What was I worried about recently?",
  "When did I first start thinking about changing routines?",
  "What made me happy or gave me energy?",
  "Have I written about work stress or balance?",
  "What goals or intentions did I set for myself?",
  "What lessons did I write down about relationships?",
];

export const AskPastSelfView: React.FC<AskPastSelfViewProps> = ({
  interactions,
  onOpenInteraction,
  userId,
}) => {
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<QAPair[]>([]);

  const handleAsk = async (queryToAsk?: string) => {
    const q = (queryToAsk || question).trim();
    if (!q) return;

    if (interactions.length === 0) {
      setError("No journal entries available. Write reflections first to ask your past self.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/gemini/ask-past-self", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          entries: interactions.map((i) => ({
            id: i.id,
            title: i.title,
            createdAt: i.createdAt,
            updatedAt: i.updatedAt,
            preview: i.preview,
          })),
          userId,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to query past self.");
      }

      const newQA: QAPair = {
        question: q,
        answer: data.answer,
        hasEnoughInfo: data.hasEnoughInfo,
        citations: data.citations || [],
        timestamp: Date.now(),
        modelUsed: data.modelUsed,
      };

      setHistory((prev) => [newQA, ...prev]);
      setQuestion("");
    } catch (err: any) {
      setError(err.message || "Failed to query past journal history.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#050505] text-stone-200">
      {/* Header */}
      <div className="p-6 md:p-8 border-b border-white/5 bg-[#080808]/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase bg-sky-500/10 text-sky-300 border border-sky-500/20">
                Feature 3
              </span>
              <h1 className="text-2xl font-serif tracking-tight text-white flex items-center gap-2.5">
                <History className="w-5 h-5 text-sky-400" />
                Ask Your Past Self
              </h1>
            </div>
            <p className="mt-1 text-xs text-stone-400 max-w-xl leading-relaxed">
              Query your personal journal history using stored entries as the ground truth. Gemini provides direct citations and explicitly reports if information is absent.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-4xl mx-auto w-full p-6 md:p-8 space-y-6">
        {/* Anti-hallucination guarantee notice */}
        <div className="p-4 bg-stone-900/60 border border-stone-800/80 rounded-xl flex items-start gap-3.5 text-xs text-stone-400">
          <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 leading-relaxed">
            <span className="text-stone-200 font-medium">Archival Source of Truth</span>
            <p>
              Answers are derived solely from your stored reflections. If you haven't written about a subject, the model will explicitly state that the journal does not contain enough information, preventing simulated memories.
            </p>
          </div>
        </div>

        {/* Input Box */}
        <div className="p-4 bg-stone-900/80 border border-white/10 rounded-xl shadow-lg space-y-3">
          <label htmlFor="input-past-self" className="text-xs uppercase tracking-wider font-semibold text-stone-300">
            Ask a Question About Your Journal History
          </label>
          <div className="flex gap-2">
            <input
              id="input-past-self"
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAsk();
                }
              }}
              placeholder="e.g. What was I worried about last month? When did I first mention career change?"
              className="flex-1 px-4 py-2.5 bg-stone-950 border border-white/10 rounded-lg text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-sky-500/50"
            />
            <button
              id="btn-submit-past-self"
              onClick={() => handleAsk()}
              disabled={isLoading || !question.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-stone-950 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed shrink-0"
            >
              <Send className={`w-3.5 h-3.5 ${isLoading ? "animate-pulse" : ""}`} />
              <span>{isLoading ? "Querying..." : "Ask"}</span>
            </button>
          </div>

          {/* Quick Prompt Suggestions */}
          <div className="pt-2 space-y-1.5">
            <span className="text-[11px] uppercase tracking-wider text-stone-500">Suggested queries:</span>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_QUESTIONS.map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setQuestion(sample);
                    handleAsk(sample);
                  }}
                  disabled={isLoading}
                  className="px-2.5 py-1 rounded-md bg-stone-950/60 border border-white/5 hover:border-sky-500/30 text-stone-400 hover:text-stone-200 text-xs transition-colors cursor-pointer text-left"
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-950/30 border border-rose-800/50 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="p-8 border border-white/5 rounded-xl bg-stone-900/30 text-center space-y-2">
            <Sparkles className="w-6 h-6 text-sky-400 animate-spin mx-auto" />
            <p className="text-xs text-stone-300">Searching your journal history for truthful ground evidence...</p>
          </div>
        )}

        {/* Q&A History Stream */}
        <div className="space-y-6">
          {history.length === 0 && !isLoading && (
            <div className="text-center py-12 text-stone-500 text-xs">
              No questions asked yet. Choose a suggestion above or enter your own inquiry.
            </div>
          )}

          {history.map((item, idx) => (
            <div
              key={idx}
              className="p-6 rounded-xl border border-white/10 bg-stone-900/50 space-y-4 shadow-sm"
            >
              {/* Question */}
              <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center text-xs font-bold">
                    Q
                  </span>
                  <h3 className="text-base font-serif font-medium text-stone-100">{item.question}</h3>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-stone-500">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  {item.modelUsed && (
                    <span className="px-1.5 py-0.5 rounded bg-white/5 text-stone-400 border border-white/5">
                      {item.modelUsed}
                    </span>
                  )}
                </div>
              </div>

              {/* Insufficient info banner if applicable */}
              {!item.hasEnoughInfo && (
                <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-lg flex items-center gap-2.5 text-xs text-amber-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>
                    <strong>Anti-Hallucination Notice:</strong> Your journal does not contain sufficient recorded data to answer this conclusively. Gemini has reported only what was confirmed.
                  </span>
                </div>
              )}

              {/* Answer Content */}
              <div className="text-sm text-stone-300 leading-relaxed whitespace-pre-wrap">
                {item.answer}
              </div>

              {/* Citations Box */}
              {item.citations && item.citations.length > 0 && (
                <div className="pt-2 border-t border-white/5 space-y-2">
                  <div className="text-[11px] uppercase tracking-wider font-semibold text-sky-400 flex items-center gap-1.5">
                    <Quote className="w-3.5 h-3.5" />
                    <span>Supporting Journal Citations ({item.citations.length})</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {item.citations.map((cit, cIdx) => (
                      <div
                        key={cIdx}
                        className="p-3 bg-stone-950/70 border border-white/5 rounded-lg space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between text-stone-400">
                          <span className="font-medium text-stone-200 truncate">{cit.entryTitle}</span>
                          <span className="text-[10px] text-stone-500 shrink-0 ml-2">{cit.date}</span>
                        </div>
                        <p className="text-stone-400 italic text-[11px] line-clamp-2">
                          "{cit.relevantExcerpt}"
                        </p>
                        {cit.entryId && (
                          <div className="pt-1 flex justify-end">
                            <button
                              onClick={() => onOpenInteraction(cit.entryId)}
                              className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 text-[10px] uppercase tracking-wider cursor-pointer"
                            >
                              <span>View Entry</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
