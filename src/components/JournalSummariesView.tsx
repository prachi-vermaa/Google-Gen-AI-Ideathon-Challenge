import React, { useState } from "react";
import { JournalInteraction, PeriodSummaryData } from "../types";
import {
  FileText,
  Calendar,
  Sparkles,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Target,
  Smile,
  HelpCircle,
  Download,
  Share2,
  BookOpen,
} from "lucide-react";

interface JournalSummariesViewProps {
  interactions: JournalInteraction[];
  userId: string;
}

export const JournalSummariesView: React.FC<JournalSummariesViewProps> = ({
  interactions,
  userId,
}) => {
  const [periodType, setPeriodType] = useState<"session" | "week" | "month" | "custom">("week");
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<PeriodSummaryData | null>(null);

  const handleGenerateSummary = async () => {
    setError(null);

    let entriesToSummarize: JournalInteraction[] = [];
    let periodLabel = "";

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    if (periodType === "session") {
      const target = interactions.find((i) => i.id === selectedSessionId) || interactions[0];
      if (!target) {
        setError("Please select a valid journal session to summarize.");
        return;
      }
      entriesToSummarize = [target];
      periodLabel = `Session: "${target.title}"`;
    } else if (periodType === "week") {
      const sevenDaysAgo = now - 7 * oneDay;
      entriesToSummarize = interactions.filter((i) => (i.createdAt || i.updatedAt) >= sevenDaysAgo);
      periodLabel = "Past 7 Days";
    } else if (periodType === "month") {
      const thirtyDaysAgo = now - 30 * oneDay;
      entriesToSummarize = interactions.filter((i) => (i.createdAt || i.updatedAt) >= thirtyDaysAgo);
      periodLabel = "Past 30 Days";
    } else if (periodType === "custom") {
      if (!customStartDate || !customEndDate) {
        setError("Please select both a start date and an end date.");
        return;
      }
      const startMs = new Date(customStartDate).getTime();
      const endMs = new Date(customEndDate).getTime() + oneDay; // inclusive
      entriesToSummarize = interactions.filter((i) => {
        const t = i.createdAt || i.updatedAt;
        return t >= startMs && t <= endMs;
      });
      periodLabel = `${customStartDate} to ${customEndDate}`;
    }

    if (entriesToSummarize.length === 0) {
      setError(`No journal entries found for ${periodLabel}. Write reflections in this period first.`);
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch("/api/gemini/summarize-period", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodType,
          periodLabel,
          entries: entriesToSummarize.map((i) => ({
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
        throw new Error(data.error || "Failed to generate summary.");
      }

      setSummary({
        ...data.summary,
        generatedAt: Date.now(),
        modelUsed: data.modelUsed,
      });
    } catch (err: any) {
      setError(err.message || "Failed to synthesize journal summary.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#050505] text-stone-200">
      {/* Header */}
      <div className="p-6 md:p-8 border-b border-white/5 bg-[#080808]/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase bg-rose-500/10 text-rose-300 border border-rose-500/20">
                Feature 7
              </span>
              <h1 className="text-2xl font-serif tracking-tight text-white flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-rose-400" />
                Journal Summaries
              </h1>
            </div>
            <p className="mt-1 text-xs text-stone-400 max-w-xl leading-relaxed">
              Generate structured, grounded syntheses across a session, week, month, or custom date range. Uncover what happened, what mattered, and positive moments.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-5xl mx-auto w-full p-6 md:p-8 space-y-6">
        {/* Period Selection Controls */}
        <div className="p-5 bg-stone-900/80 border border-white/10 rounded-xl space-y-4 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs uppercase tracking-wider font-semibold text-stone-300">
              Select Time Horizon
            </span>
            <div className="flex items-center gap-1.5 bg-stone-950 p-1 rounded-lg border border-white/5 text-xs">
              <button
                onClick={() => setPeriodType("week")}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  periodType === "week" ? "bg-white/10 text-white font-medium" : "text-stone-400 hover:text-stone-200"
                }`}
              >
                Past Week
              </button>
              <button
                onClick={() => setPeriodType("month")}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  periodType === "month" ? "bg-white/10 text-white font-medium" : "text-stone-400 hover:text-stone-200"
                }`}
              >
                Past Month
              </button>
              <button
                onClick={() => setPeriodType("custom")}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  periodType === "custom" ? "bg-white/10 text-white font-medium" : "text-stone-400 hover:text-stone-200"
                }`}
              >
                Custom Range
              </button>
              <button
                onClick={() => setPeriodType("session")}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  periodType === "session" ? "bg-white/10 text-white font-medium" : "text-stone-400 hover:text-stone-200"
                }`}
              >
                Individual Session
              </button>
            </div>
          </div>

          {/* Conditional Controls */}
          {periodType === "session" && (
            <div className="space-y-1.5 text-xs">
              <label className="text-stone-400 block font-medium">Choose Journal Session:</label>
              <select
                value={selectedSessionId || (interactions[0]?.id ?? "")}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="w-full px-3 py-2 bg-stone-950 border border-white/10 rounded-lg text-stone-200 focus:outline-none focus:border-rose-500/50"
              >
                {interactions.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.title} ({new Date(i.createdAt).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
          )}

          {periodType === "custom" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-stone-400 block mb-1">Start Date:</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-white/10 rounded-lg text-stone-200 focus:outline-none focus:border-rose-500/50"
                />
              </div>
              <div>
                <label className="text-stone-400 block mb-1">End Date:</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-white/10 rounded-lg text-stone-200 focus:outline-none focus:border-rose-500/50"
                />
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              id="btn-generate-period-summary"
              onClick={handleGenerateSummary}
              disabled={isGenerating || interactions.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors cursor-pointer disabled:opacity-40"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
              <span>{isGenerating ? "Synthesizing Summary..." : "Generate Summary"}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-950/30 border border-rose-800/50 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isGenerating && (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-rose-400 animate-spin mx-auto" />
            <p className="text-sm font-medium text-stone-200">Reading entries and synthesizing what mattered...</p>
            <p className="text-xs text-stone-500">Extracting recurring themes, decisions, and lessons learned.</p>
          </div>
        )}

        {/* Rendered Summary Display */}
        {summary && !isGenerating && (
          <div className="space-y-6 p-6 md:p-8 rounded-2xl border border-white/10 bg-stone-900/40 shadow-xl">
            {/* Summary Top Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-rose-400 font-semibold block">
                  Comprehensive Period Review
                </span>
                <h2 className="text-xl font-serif text-white mt-0.5">{summary.periodLabel}</h2>
              </div>
              <div className="flex items-center gap-3 text-xs text-stone-400">
                <span>{summary.entryCount} entries synthesized</span>
                {summary.modelUsed && (
                  <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[10px]">
                    {summary.modelUsed}
                  </span>
                )}
              </div>
            </div>

            {/* Structured Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Section 1: What Happened */}
              <div className="p-4 bg-stone-950/60 rounded-xl border border-white/5 space-y-1.5">
                <span className="text-xs uppercase tracking-wider font-semibold text-sky-400 block">
                  1. What Happened
                </span>
                <p className="text-xs text-stone-300 leading-relaxed">{summary.whatHappened}</p>
              </div>

              {/* Section 2: What Mattered */}
              <div className="p-4 bg-stone-950/60 rounded-xl border border-white/5 space-y-1.5">
                <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400 block">
                  2. What Mattered
                </span>
                <p className="text-xs text-stone-300 leading-relaxed">{summary.whatMattered}</p>
              </div>

              {/* Section 3: Recurring Themes */}
              {summary.recurringThemes && summary.recurringThemes.length > 0 && (
                <div className="p-4 bg-stone-950/60 rounded-xl border border-white/5 space-y-2">
                  <span className="text-xs uppercase tracking-wider font-semibold text-amber-400 block">
                    3. Recurring Themes
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-xs text-stone-300">
                    {summary.recurringThemes.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Section 4: Decisions */}
              {summary.decisions && summary.decisions.length > 0 && (
                <div className="p-4 bg-stone-950/60 rounded-xl border border-white/5 space-y-2">
                  <span className="text-xs uppercase tracking-wider font-semibold text-teal-400 block">
                    4. Decisions Made
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-xs text-stone-300">
                    {summary.decisions.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Section 5: Goals Mentioned */}
              {summary.goalsMentioned && summary.goalsMentioned.length > 0 && (
                <div className="p-4 bg-stone-950/60 rounded-xl border border-white/5 space-y-2">
                  <span className="text-xs uppercase tracking-wider font-semibold text-indigo-400 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" />
                    5. Goals Mentioned
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-xs text-stone-300">
                    {summary.goalsMentioned.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Section 6: Positive Moments */}
              {summary.positiveMoments && summary.positiveMoments.length > 0 && (
                <div className="p-4 bg-stone-950/60 rounded-xl border border-white/5 space-y-2">
                  <span className="text-xs uppercase tracking-wider font-semibold text-yellow-400 flex items-center gap-1.5">
                    <Smile className="w-3.5 h-3.5" />
                    6. Positive Moments
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-xs text-stone-300">
                    {summary.positiveMoments.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Section 7: Things to Revisit */}
            {summary.thingsToRevisit && summary.thingsToRevisit.length > 0 && (
              <div className="p-4 bg-rose-950/20 rounded-xl border border-rose-800/30 space-y-2">
                <span className="text-xs uppercase tracking-wider font-semibold text-rose-300 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5" />
                  7. Things to Revisit
                </span>
                <ul className="list-disc list-inside space-y-1 text-xs text-rose-100/90">
                  {summary.thingsToRevisit.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
