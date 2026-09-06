import React, { useState } from "react";
import { JournalInteraction, LifeMirrorPattern } from "../types";
import {
  Sparkles,
  Compass,
  Smile,
  AlertTriangle,
  Target,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  Info,
  ShieldCheck,
  ChevronRight,
  Flame,
} from "lucide-react";

interface LifeMirrorViewProps {
  interactions: JournalInteraction[];
  onOpenInteraction: (id: string) => void;
  userId: string;
}

const CATEGORY_META = {
  topics: { label: "Frequent Topics", icon: Compass, color: "text-sky-400 bg-sky-950/40 border-sky-800/40" },
  concerns: { label: "Repeated Concerns", icon: AlertTriangle, color: "text-amber-400 bg-amber-950/40 border-amber-800/40" },
  goals: { label: "Goals & Intentions", icon: Target, color: "text-emerald-400 bg-emerald-950/40 border-emerald-800/40" },
  joy: { label: "Sources of Joy", icon: Smile, color: "text-yellow-400 bg-yellow-950/40 border-yellow-800/40" },
  frustrations: { label: "Recurring Frustrations", icon: Flame, color: "text-rose-400 bg-rose-950/40 border-rose-800/40" },
  priorities: { label: "Changes in Priorities", icon: TrendingUp, color: "text-indigo-400 bg-indigo-950/40 border-indigo-800/40" },
  situations: { label: "Repeated Situations", icon: Compass, color: "text-purple-400 bg-purple-950/40 border-purple-800/40" },
  growth: { label: "Personal Growth Over Time", icon: Sparkles, color: "text-teal-400 bg-teal-950/40 border-teal-800/40" },
};

export const LifeMirrorView: React.FC<LifeMirrorViewProps> = ({
  interactions,
  onOpenInteraction,
  userId,
}) => {
  const [patterns, setPatterns] = useState<LifeMirrorPattern[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [hasRunInitial, setHasRunInitial] = useState(false);

  const runLifeMirrorAnalysis = async () => {
    if (interactions.length === 0) {
      setAnalysisError("You don't have any journal entries yet. Write a few reflections to discover patterns.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const response = await fetch("/api/gemini/lifemirror", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        throw new Error(data.error || "Failed to analyze patterns.");
      }

      setPatterns(data.patterns || []);
      setHasRunInitial(true);
    } catch (err: any) {
      setAnalysisError(err.message || "Failed to run LifeMirror pattern discovery.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const filteredPatterns =
    selectedCategory === "all"
      ? patterns
      : patterns.filter((p) => p.category === selectedCategory);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#050505] text-stone-200">
      {/* Header */}
      <div className="p-6 md:p-8 border-b border-white/5 bg-[#080808]/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase bg-amber-500/10 text-amber-300 border border-amber-500/20">
                Feature 2
              </span>
              <h1 className="text-2xl font-serif tracking-tight text-white flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-amber-400" />
                LifeMirror — Long-Term Pattern Discovery
              </h1>
            </div>
            <p className="mt-1 text-xs text-stone-400 max-w-2xl leading-relaxed">
              Understand your experiences across multiple journal entries. LifeMirror identifies recurring themes,
              distinguishing strictly between what you explicitly wrote and AI-generated reflective hypotheses.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="btn-run-lifemirror"
              onClick={runLifeMirrorAnalysis}
              disabled={isAnalyzing || interactions.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-medium text-xs uppercase tracking-wider rounded-lg transition-all shadow-md shadow-amber-950/20 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? "animate-spin" : ""}`} />
              <span>{isAnalyzing ? "Discovering Patterns..." : hasRunInitial ? "Refresh Analysis" : "Analyze Journal History"}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-6xl mx-auto w-full p-6 md:p-8 space-y-6">
        {/* Anti-Hallucination & Epistemic Honesty Banner */}
        <div className="p-4 bg-stone-900/60 border border-stone-800/80 rounded-xl flex items-start gap-3.5 text-xs text-stone-400">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <p className="text-stone-200 font-medium">Epistemic Clarity Guarantee</p>
            <p>
              LifeMirror strictly separates <strong className="text-stone-100">Direct User Evidence</strong> (words you literally wrote, cited by date and entry) from <strong className="text-amber-300">AI-Generated Interpretation</strong>. AI reflections are exploratory hypotheses for you to consider, never objective facts.
            </p>
          </div>
        </div>

        {analysisError && (
          <div className="p-4 bg-rose-950/30 border border-rose-800/50 rounded-xl text-xs text-rose-300 flex items-center justify-between">
            <span>{analysisError}</span>
            <button
              onClick={runLifeMirrorAnalysis}
              className="underline hover:text-rose-200 ml-4 cursor-pointer"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Initial Empty State or Prompt to Run */}
        {!hasRunInitial && !isAnalyzing && (
          <div className="text-center py-16 px-4 border border-dashed border-white/10 rounded-2xl bg-stone-900/20 max-w-2xl mx-auto space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-serif text-stone-200">Ready to Discover Your Patterns</h3>
              <p className="text-xs text-stone-400 max-w-md mx-auto leading-relaxed">
                You have {interactions.length} journal {interactions.length === 1 ? "entry" : "entries"}. LifeMirror will cross-examine your entries to surface recurring goals, repeated frustrations, sources of joy, and personal growth.
              </p>
            </div>
            <button
              id="btn-discover-patterns-empty"
              onClick={runLifeMirrorAnalysis}
              disabled={interactions.length === 0}
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-stone-950 text-xs uppercase tracking-wider font-semibold rounded-lg hover:bg-amber-400 transition-colors shadow-lg cursor-pointer disabled:opacity-50"
            >
              <span>{interactions.length === 0 ? "Add Journal Entries First" : "Run LifeMirror Now"}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Analyzing Animation */}
        {isAnalyzing && (
          <div className="py-20 text-center space-y-4">
            <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-stone-200">Synthesizing Journal History...</p>
              <p className="text-xs text-stone-500">Cross-referencing recurring topics, emotional markers, and intentions with strict user-data isolation.</p>
            </div>
          </div>
        )}

        {/* Categories Tabs & Pattern Grid */}
        {hasRunInitial && !isAnalyzing && (
          <div className="space-y-6">
            {/* Category Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-white/5">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  selectedCategory === "all"
                    ? "bg-white/10 text-white border border-white/15"
                    : "text-stone-400 hover:text-stone-200 hover:bg-white/5"
                }`}
              >
                All Patterns ({patterns.length})
              </button>
              {Object.entries(CATEGORY_META).map(([key, meta]) => {
                const count = patterns.filter((p) => p.category === key).length;
                if (count === 0) return null;
                const Icon = meta.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedCategory(key)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      selectedCategory === key
                        ? "bg-white/10 text-white border border-white/15"
                        : "text-stone-400 hover:text-stone-200 hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{meta.label}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-stone-300">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {filteredPatterns.length === 0 ? (
              <div className="p-12 text-center text-xs text-stone-500 border border-white/5 rounded-xl bg-stone-900/10">
                No patterns identified under this category yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPatterns.map((pattern, idx) => {
                  const meta = CATEGORY_META[pattern.category] || CATEGORY_META.topics;
                  const Icon = meta.icon;

                  return (
                    <div
                      key={pattern.id || idx}
                      className="p-5 rounded-xl border border-white/10 bg-stone-900/40 hover:border-white/20 transition-all flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        {/* Header Badge */}
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border ${meta.color}`}
                          >
                            <Icon className="w-3 h-3" />
                            {meta.label}
                          </span>
                          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 text-stone-400 border border-white/5">
                            {pattern.confidence || "Observed"} Confidence
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-serif font-medium text-stone-100 leading-snug">
                          {pattern.title}
                        </h3>

                        {/* Direct Evidence Box */}
                        <div className="p-3.5 bg-stone-950/60 rounded-lg border border-white/5 space-y-2">
                          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            What You Explicitly Wrote:
                          </div>
                          {pattern.explicitEvidence && pattern.explicitEvidence.length > 0 ? (
                            <div className="space-y-2">
                              {pattern.explicitEvidence.map((ev, evIdx) => (
                                <div key={evIdx} className="text-xs text-stone-300 space-y-1">
                                  <blockquote className="border-l-2 border-emerald-500/40 pl-2.5 italic text-stone-300">
                                    "{ev.quote}"
                                  </blockquote>
                                  <div className="flex items-center justify-between text-[11px] text-stone-500 pt-0.5">
                                    <span>
                                      {ev.entryTitle} • {ev.date}
                                    </span>
                                    {ev.entryId && (
                                      <button
                                        onClick={() => onOpenInteraction(ev.entryId)}
                                        className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 cursor-pointer text-[10px] uppercase tracking-wider"
                                      >
                                        <span>Open Entry</span>
                                        <ExternalLink className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-stone-400 italic">Referenced across your recent reflections.</p>
                          )}
                        </div>

                        {/* AI Reflective Interpretation */}
                        <div className="p-3 bg-amber-950/20 border border-amber-800/30 rounded-lg space-y-1">
                          <div className="flex items-center gap-1 text-[11px] uppercase tracking-wider font-medium text-amber-300">
                            <Info className="w-3 h-3" />
                            <span>Reflective Hypothesis (AI Interpretation):</span>
                          </div>
                          <p className="text-xs text-amber-100/80 leading-relaxed">
                            {pattern.aiInterpretation}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
