import React, { useState } from "react";
import { JournalInteraction, DecisionData } from "../types";
import {
  CheckCircle2,
  Plus,
  Scale,
  Sparkles,
  Calendar,
  Clock,
  HelpCircle,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Edit3,
  ExternalLink,
  ShieldCheck,
  Save,
  Check,
} from "lucide-react";
import { doc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

interface DecisionJournalViewProps {
  interactions: JournalInteraction[];
  onOpenInteraction: (id: string) => void;
  userId: string;
}

export const DecisionJournalView: React.FC<DecisionJournalViewProps> = ({
  interactions,
  onOpenInteraction,
  userId,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "resolved">("all");

  // Create Decision Form State
  const [decisionTitle, setDecisionTitle] = useState("");
  const [context, setContext] = useState("");
  const [optionsText, setOptionsText] = useState("");
  const [reasons, setReasons] = useState("");
  const [expectedOutcome, setExpectedOutcome] = useState("");
  const [concerns, setConcerns] = useState("");
  const [confidenceLevel, setConfidenceLevel] = useState(7);
  const [isSaving, setIsSaving] = useState(false);
  const [geminiAssistText, setGeminiAssistText] = useState<string | null>(null);
  const [isAssisting, setIsAssisting] = useState(false);

  // Review Outcome Form State for existing decision
  const [reviewingDecisionId, setReviewingDecisionId] = useState<string | null>(null);
  const [whatActuallyHappened, setWhatActuallyHappened] = useState("");
  const [whatWentWell, setWhatWentWell] = useState("");
  const [whatWentDifferently, setWhatWentDifferently] = useState("");
  const [whatTheyLearned, setWhatTheyLearned] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Decisions list derived from interactions
  const decisionEntries = interactions.filter((i) => i.decision && i.decision.isDecision);

  const filteredDecisions = decisionEntries.filter((i) => {
    if (activeTab === "pending") return i.decision?.status === "pending";
    if (activeTab === "resolved") return i.decision?.status === "resolved";
    return true;
  });

  const handleGeminiDecisionAssist = async () => {
    if (!decisionTitle.trim()) return;
    setIsAssisting(true);
    setGeminiAssistText(null);

    try {
      const response = await fetch("/api/gemini/decision-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decisionTitle,
          context,
          optionsConsidered: optionsText
            .split("\n")
            .map((o) => o.trim())
            .filter(Boolean),
          reasons,
          concerns,
          expectedOutcome,
          confidenceLevel,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to assist with decision.");
      }

      setGeminiAssistText(data.synthesis);
    } catch (err: any) {
      setGeminiAssistText(`Error: ${err.message}`);
    } finally {
      setIsAssisting(false);
    }
  };

  const handleCreateDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionTitle.trim() || !userId) return;

    setIsSaving(true);
    try {
      const newId = `decision_${Date.now()}`;
      const options = optionsText
        .split("\n")
        .map((o) => o.trim())
        .filter(Boolean);

      const decisionData: DecisionData = {
        isDecision: true,
        decisionTitle: decisionTitle.trim(),
        date: Date.now(),
        context: context.trim(),
        optionsConsidered: options,
        reasons: reasons.trim(),
        expectedOutcome: expectedOutcome.trim(),
        concerns: concerns.trim(),
        confidenceLevel,
        status: "pending",
      };

      const newInteraction: JournalInteraction = {
        id: newId,
        title: `Decision: ${decisionTitle.trim()}`,
        userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        preview: `${context.trim().slice(0, 150)}... Expected: ${expectedOutcome.trim()}`,
        messageCount: 1,
        tags: ["decision", "decision-journal"],
        decision: decisionData,
      };

      // Strip any undefined
      const sanitized = JSON.parse(JSON.stringify(newInteraction));
      await setDoc(doc(db, "users", userId, "interactions", newId), sanitized);

      // Reset form
      setDecisionTitle("");
      setContext("");
      setOptionsText("");
      setReasons("");
      setExpectedOutcome("");
      setConcerns("");
      setConfidenceLevel(7);
      setGeminiAssistText(null);
      setShowCreateModal(false);
    } catch (err: any) {
      alert("Failed to save decision: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveOutcomeReview = async (interactionId: string) => {
    if (!userId) return;
    setIsSubmittingReview(true);

    try {
      const targetInteraction = interactions.find((i) => i.id === interactionId);
      if (!targetInteraction || !targetInteraction.decision) return;

      const updatedDecision: DecisionData = {
        ...targetInteraction.decision,
        outcomeReviewedAt: Date.now(),
        whatActuallyHappened: whatActuallyHappened.trim(),
        whatWentWell: whatWentWell.trim(),
        whatWentDifferently: whatWentDifferently.trim(),
        whatTheyLearned: whatTheyLearned.trim(),
        status: "resolved",
      };

      const sanitized = JSON.parse(JSON.stringify({ decision: updatedDecision, updatedAt: Date.now() }));
      await updateDoc(doc(db, "users", userId, "interactions", interactionId), sanitized);

      setReviewingDecisionId(null);
      setWhatActuallyHappened("");
      setWhatWentWell("");
      setWhatWentDifferently("");
      setWhatTheyLearned("");
    } catch (err: any) {
      alert("Failed to save outcome review: " + err.message);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const startReviewing = (item: JournalInteraction) => {
    setReviewingDecisionId(item.id);
    setWhatActuallyHappened(item.decision?.whatActuallyHappened || "");
    setWhatWentWell(item.decision?.whatWentWell || "");
    setWhatWentDifferently(item.decision?.whatWentDifferently || "");
    setWhatTheyLearned(item.decision?.whatTheyLearned || "");
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#050505] text-stone-200">
      {/* Header */}
      <div className="p-6 md:p-8 border-b border-white/5 bg-[#080808]/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                Feature 4
              </span>
              <h1 className="text-2xl font-serif tracking-tight text-white flex items-center gap-2.5">
                <Scale className="w-5 h-5 text-emerald-400" />
                Decision Journal
              </h1>
            </div>
            <p className="mt-1 text-xs text-stone-400 max-w-xl leading-relaxed">
              Capture decisions with options, expected outcomes, and confidence ratings. Review what happened over time to build calibrated judgment.
            </p>
          </div>

          <button
            id="btn-create-decision"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-semibold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Record New Decision</span>
          </button>
        </div>
      </div>

      <div className="flex-1 max-w-5xl mx-auto w-full p-6 md:p-8 space-y-6">
        {/* Agency Notice */}
        <div className="p-4 bg-stone-900/60 border border-stone-800/80 rounded-xl flex items-start gap-3.5 text-xs text-stone-400">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 leading-relaxed">
            <span className="text-stone-200 font-medium">User Agency Principle</span>
            <p>
              Gemini can assist in structuring trade-offs, summarizing context, and highlighting blind spots, but <strong>will never make the decision for you</strong>. All choices and values remain yours.
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === "all"
                  ? "bg-white/10 text-white border border-white/15"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              All Decisions ({decisionEntries.length})
            </button>
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === "pending"
                  ? "bg-white/10 text-white border border-white/15"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              Pending Outcome ({decisionEntries.filter((d) => d.decision?.status === "pending").length})
            </button>
            <button
              onClick={() => setActiveTab("resolved")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === "resolved"
                  ? "bg-white/10 text-white border border-white/15"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              Outcome Reviewed ({decisionEntries.filter((d) => d.decision?.status === "resolved").length})
            </button>
          </div>
        </div>

        {/* Decisions List */}
        {filteredDecisions.length === 0 ? (
          <div className="text-center py-16 px-4 border border-dashed border-white/10 rounded-2xl bg-stone-900/20 max-w-xl mx-auto space-y-3">
            <Scale className="w-10 h-10 text-stone-600 mx-auto" />
            <h3 className="text-base font-serif text-stone-300">No decisions recorded yet</h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              Start documenting your important decisions today. You'll be able to revisit them later and reflect on what actually happened.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record First Decision</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDecisions.map((entry) => {
              const d = entry.decision!;
              const isResolved = d.status === "resolved";
              const isCurrentlyReviewing = reviewingDecisionId === entry.id;

              return (
                <div
                  key={entry.id}
                  className="p-5 md:p-6 rounded-xl border border-white/10 bg-stone-900/40 hover:border-white/20 transition-all space-y-4"
                >
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
                          isResolved
                            ? "bg-emerald-950/50 text-emerald-300 border-emerald-800/40"
                            : "bg-amber-950/50 text-amber-300 border-amber-800/40"
                        }`}
                      >
                        {isResolved ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            Outcome Reviewed
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3" />
                            Pending Outcome
                          </>
                        )}
                      </span>
                      <span className="text-xs text-stone-400">
                        {new Date(d.date).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-stone-400">
                        Confidence: <strong className="text-stone-100">{d.confidenceLevel}/10</strong>
                      </span>
                      <button
                        onClick={() => onOpenInteraction(entry.id)}
                        className="inline-flex items-center gap-1 text-[11px] text-stone-400 hover:text-white uppercase tracking-wider px-2 py-1 rounded bg-white/5 cursor-pointer ml-2"
                      >
                        <span>Open Session</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Decision Title & Context */}
                  <div className="space-y-2">
                    <h3 className="text-lg font-serif font-medium text-stone-100">{d.decisionTitle}</h3>
                    {d.context && <p className="text-xs text-stone-300 leading-relaxed">{d.context}</p>}
                  </div>

                  {/* Grid details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {d.optionsConsidered && d.optionsConsidered.length > 0 && (
                      <div className="p-3 bg-stone-950/50 rounded-lg border border-white/5 space-y-1">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-stone-400">
                          Options Considered:
                        </span>
                        <ul className="list-disc list-inside space-y-0.5 text-stone-300">
                          {d.optionsConsidered.map((opt, oIdx) => (
                            <li key={oIdx}>{opt}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {d.expectedOutcome && (
                      <div className="p-3 bg-stone-950/50 rounded-lg border border-white/5 space-y-1">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-400">
                          Expected Outcome:
                        </span>
                        <p className="text-stone-300">{d.expectedOutcome}</p>
                      </div>
                    )}

                    {d.reasons && (
                      <div className="p-3 bg-stone-950/50 rounded-lg border border-white/5 space-y-1">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-sky-400">
                          Primary Reasons:
                        </span>
                        <p className="text-stone-300">{d.reasons}</p>
                      </div>
                    )}

                    {d.concerns && (
                      <div className="p-3 bg-stone-950/50 rounded-lg border border-white/5 space-y-1">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-rose-400">
                          Concerns & Risks:
                        </span>
                        <p className="text-stone-300">{d.concerns}</p>
                      </div>
                    )}
                  </div>

                  {/* Resolved Retrospective Outcome Display */}
                  {isResolved && !isCurrentlyReviewing && (
                    <div className="p-4 bg-emerald-950/20 border border-emerald-800/30 rounded-lg space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-wider font-semibold text-emerald-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          Retrospective Outcome
                        </span>
                        <button
                          onClick={() => startReviewing(entry)}
                          className="text-[11px] text-stone-400 hover:text-stone-200 underline cursor-pointer"
                        >
                          Edit Review
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        {d.whatActuallyHappened && (
                          <div>
                            <span className="text-[10px] uppercase text-stone-400 block font-medium">What Actually Happened:</span>
                            <p className="text-stone-200 mt-0.5">{d.whatActuallyHappened}</p>
                          </div>
                        )}
                        {d.whatWentWell && (
                          <div>
                            <span className="text-[10px] uppercase text-emerald-400 block font-medium">What Went Well:</span>
                            <p className="text-stone-200 mt-0.5">{d.whatWentWell}</p>
                          </div>
                        )}
                        {d.whatWentDifferently && (
                          <div>
                            <span className="text-[10px] uppercase text-amber-400 block font-medium">What Went Differently:</span>
                            <p className="text-stone-200 mt-0.5">{d.whatWentDifferently}</p>
                          </div>
                        )}
                        {d.whatTheyLearned && (
                          <div>
                            <span className="text-[10px] uppercase text-teal-400 block font-medium">What I Learned:</span>
                            <p className="text-stone-200 mt-0.5">{d.whatTheyLearned}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Review Outcome Action or Form */}
                  {!isResolved && !isCurrentlyReviewing && (
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => startReviewing(entry)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium rounded-lg border border-white/10 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Revisit & Record What Happened</span>
                      </button>
                    </div>
                  )}

                  {/* Reviewing Inline Form */}
                  {isCurrentlyReviewing && (
                    <div className="p-4 bg-stone-950 border border-emerald-500/30 rounded-xl space-y-3">
                      <h4 className="text-xs uppercase tracking-wider font-semibold text-emerald-400">
                        Record Decision Outcome & Learnings
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div>
                          <label className="text-stone-400 block mb-1">What actually happened?</label>
                          <textarea
                            rows={2}
                            value={whatActuallyHappened}
                            onChange={(e) => setWhatActuallyHappened(e.target.value)}
                            placeholder="Describe the real-world outcome..."
                            className="w-full px-3 py-2 bg-stone-900 border border-white/10 rounded-lg text-stone-200 focus:outline-none focus:border-emerald-500/50"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="text-stone-400 block mb-1">What went well?</label>
                            <input
                              type="text"
                              value={whatWentWell}
                              onChange={(e) => setWhatWentWell(e.target.value)}
                              placeholder="Positive outcomes or validations..."
                              className="w-full px-3 py-2 bg-stone-900 border border-white/10 rounded-lg text-stone-200 focus:outline-none focus:border-emerald-500/50"
                            />
                          </div>
                          <div>
                            <label className="text-stone-400 block mb-1">What went differently than expected?</label>
                            <input
                              type="text"
                              value={whatWentDifferently}
                              onChange={(e) => setWhatWentDifferently(e.target.value)}
                              placeholder="Unexpected challenges or twists..."
                              className="w-full px-3 py-2 bg-stone-900 border border-white/10 rounded-lg text-stone-200 focus:outline-none focus:border-emerald-500/50"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-stone-400 block mb-1">What did you learn for future decisions?</label>
                          <textarea
                            rows={2}
                            value={whatTheyLearned}
                            onChange={(e) => setWhatTheyLearned(e.target.value)}
                            placeholder="Key takeaways, blind-spot revelations, or updated heuristics..."
                            className="w-full px-3 py-2 bg-stone-900 border border-white/10 rounded-lg text-stone-200 focus:outline-none focus:border-emerald-500/50"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setReviewingDecisionId(null)}
                          className="px-3 py-1.5 text-xs text-stone-400 hover:text-white cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isSubmittingReview}
                          onClick={() => handleSaveOutcomeReview(entry.id)}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-semibold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{isSubmittingReview ? "Saving..." : "Save Outcome"}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal to Create Decision */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0c0c0c] border border-white/10 rounded-2xl max-w-2xl w-full p-6 md:p-8 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-serif text-white">Record a Decision</h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-stone-400 hover:text-stone-200 text-xs uppercase cursor-pointer"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCreateDecision} className="space-y-4 text-xs">
              <div>
                <label className="block text-stone-300 font-medium mb-1">Decision Title *</label>
                <input
                  type="text"
                  required
                  value={decisionTitle}
                  onChange={(e) => setDecisionTitle(e.target.value)}
                  placeholder="e.g. Accept job offer at startup vs stay at current role"
                  className="w-full px-3.5 py-2.5 bg-stone-900 border border-white/10 rounded-lg text-stone-100 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-medium mb-1">Context & Background</label>
                <textarea
                  rows={2}
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="Why is this decision happening now? What are the background dynamics?"
                  className="w-full px-3.5 py-2 bg-stone-900 border border-white/10 rounded-lg text-stone-100 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-medium mb-1">Options Considered (one per line)</label>
                <textarea
                  rows={3}
                  value={optionsText}
                  onChange={(e) => setOptionsText(e.target.value)}
                  placeholder="Option A: Accept offer with higher equity&#10;Option B: Negotiate current role title and stay&#10;Option C: Request 2 weeks sabbatical"
                  className="w-full px-3.5 py-2 bg-stone-900 border border-white/10 rounded-lg text-stone-100 focus:outline-none focus:border-emerald-500/50 font-mono text-[11px]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-medium mb-1">Reasons for Preferred Option</label>
                  <textarea
                    rows={2}
                    value={reasons}
                    onChange={(e) => setReasons(e.target.value)}
                    placeholder="Core arguments and values driving the choice..."
                    className="w-full px-3.5 py-2 bg-stone-900 border border-white/10 rounded-lg text-stone-100 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-stone-300 font-medium mb-1">Expected Outcome</label>
                  <textarea
                    rows={2}
                    value={expectedOutcome}
                    onChange={(e) => setExpectedOutcome(e.target.value)}
                    placeholder="What do you expect to happen in 3–6 months?"
                    className="w-full px-3.5 py-2 bg-stone-900 border border-white/10 rounded-lg text-stone-100 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-medium mb-1">Concerns & Potential Risks</label>
                  <input
                    type="text"
                    value={concerns}
                    onChange={(e) => setConcerns(e.target.value)}
                    placeholder="What might go wrong? Worst case scenario?"
                    className="w-full px-3.5 py-2.5 bg-stone-900 border border-white/10 rounded-lg text-stone-100 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-stone-300 font-medium">Confidence Level (1–10)</label>
                    <span className="font-bold text-emerald-400">{confidenceLevel} / 10</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={confidenceLevel}
                    onChange={(e) => setConfidenceLevel(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Gemini Decision Companion Assist Button */}
              <div className="pt-2 border-t border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-stone-400">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Gemini Decision Companion Assist (Summarizes & Blind-Spot Check)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleGeminiDecisionAssist}
                    disabled={isAssisting || !decisionTitle.trim()}
                    className="px-3 py-1 bg-white/10 hover:bg-white/15 text-stone-200 text-[11px] rounded transition-colors cursor-pointer disabled:opacity-40"
                  >
                    {isAssisting ? "Analyzing..." : "Review Blind Spots"}
                  </button>
                </div>

                {geminiAssistText && (
                  <div className="p-3.5 bg-stone-950 rounded-lg border border-emerald-500/20 text-stone-300 space-y-1 text-xs whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {geminiAssistText}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-stone-400 hover:text-stone-200 text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !decisionTitle.trim()}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSaving ? "Saving Decision..." : "Save to Decision Journal"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
