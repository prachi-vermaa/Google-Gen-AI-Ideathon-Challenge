import React, { useState } from "react";
import { JournalInteraction, SearchMatch } from "../types";
import {
  Search,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Clock,
  ArrowRight,
  BookOpen,
} from "lucide-react";

interface IntelligentSearchViewProps {
  interactions: JournalInteraction[];
  onOpenInteraction: (id: string) => void;
  userId: string;
}

const EXAMPLE_SEARCHES = [
  "Find entries where I talked about work stress",
  "Show me entries about travelling or new places",
  "When did I write about starting this project?",
  "Find my happiest entries or moments of gratitude",
  "Entries where I felt indecisive or stuck",
];

export const IntelligentSearchView: React.FC<IntelligentSearchViewProps> = ({
  interactions,
  onOpenInteraction,
  userId,
}) => {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchMatch[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (queryText?: string) => {
    const q = (queryText || query).trim();
    if (!q) return;

    if (interactions.length === 0) {
      setSearchError("No journal entries to search. Create reflections first.");
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const response = await fetch("/api/gemini/intelligent-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
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
        throw new Error(data.error || "Search query failed.");
      }

      setResults(data.matches || []);
      setHasSearched(true);
    } catch (err: any) {
      setSearchError(err.message || "Failed to complete search.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#050505] text-stone-200">
      {/* Header */}
      <div className="p-6 md:p-8 border-b border-white/5 bg-[#080808]/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase bg-violet-500/10 text-violet-300 border border-violet-500/20">
                Feature 6
              </span>
              <h1 className="text-2xl font-serif tracking-tight text-white flex items-center gap-2.5">
                <Search className="w-5 h-5 text-violet-400" />
                Intelligent Journal Search
              </h1>
            </div>
            <p className="mt-1 text-xs text-stone-400 max-w-xl leading-relaxed">
              Natural language semantic search across your personal entries. Search by feeling, life situation, or question rather than rigid keywords.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-4xl mx-auto w-full p-6 md:p-8 space-y-6">
        {/* Isolation notice */}
        <div className="p-4 bg-stone-900/60 border border-stone-800/80 rounded-xl flex items-start gap-3.5 text-xs text-stone-400">
          <ShieldCheck className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 leading-relaxed">
            <span className="text-stone-200 font-medium">Strict Privacy Isolation</span>
            <p>
              Semantic indexing executes strictly against your own authenticated entries. Content is never shared across user boundaries or used for global model training.
            </p>
          </div>
        </div>

        {/* Natural Search Bar */}
        <div className="p-4 bg-stone-900/80 border border-white/10 rounded-xl space-y-3 shadow-lg">
          <label htmlFor="input-intelligent-search" className="text-xs uppercase tracking-wider font-semibold text-stone-300">
            Natural Language Query
          </label>
          <div className="flex gap-2">
            <input
              id="input-intelligent-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
              placeholder="e.g. Find entries where I talked about burnout or finding purpose"
              className="flex-1 px-4 py-2.5 bg-stone-950 border border-white/10 rounded-lg text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-violet-500/50"
            />
            <button
              id="btn-run-search"
              onClick={() => handleSearch()}
              disabled={isSearching || !query.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors cursor-pointer disabled:opacity-40 shrink-0"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isSearching ? "animate-spin" : ""}`} />
              <span>{isSearching ? "Searching..." : "Search"}</span>
            </button>
          </div>

          {/* Quick Example Suggestions */}
          <div className="pt-2 space-y-1.5">
            <span className="text-[11px] uppercase tracking-wider text-stone-500">Sample queries:</span>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLE_SEARCHES.map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setQuery(sample);
                    handleSearch(sample);
                  }}
                  disabled={isSearching}
                  className="px-2.5 py-1 rounded-md bg-stone-950/60 border border-white/5 hover:border-violet-500/30 text-stone-400 hover:text-stone-200 text-xs transition-colors cursor-pointer text-left"
                >
                  "{sample}"
                </button>
              ))}
            </div>
          </div>
        </div>

        {searchError && (
          <div className="p-4 bg-rose-950/30 border border-rose-800/50 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{searchError}</span>
          </div>
        )}

        {isSearching && (
          <div className="py-16 text-center space-y-2">
            <Sparkles className="w-6 h-6 text-violet-400 animate-spin mx-auto" />
            <p className="text-xs text-stone-300">Analyzing semantic intent across your reflections...</p>
          </div>
        )}

        {/* Results List */}
        {hasSearched && !isSearching && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-stone-400 border-b border-white/5 pb-2">
              <span>Found {results.length} semantic {results.length === 1 ? "match" : "matches"}</span>
              <span className="text-[11px] text-stone-500">Ordered by relevance</span>
            </div>

            {results.length === 0 ? (
              <div className="p-12 text-center text-xs text-stone-500 border border-white/5 rounded-xl bg-stone-900/10">
                No entries found that matched your inquiry. Try rephrasing with different themes or concepts.
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((match, idx) => (
                  <div
                    key={match.entryId || idx}
                    className="p-5 rounded-xl border border-white/10 bg-stone-900/40 hover:border-white/20 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-violet-300 px-2 py-0.5 rounded bg-violet-950/60 border border-violet-800/40">
                            {match.relevanceScore}% Relevance
                          </span>
                          <span className="text-[11px] text-stone-500">{match.date}</span>
                        </div>
                        <h3 className="text-base font-serif font-medium text-stone-100 mt-1">
                          {match.entryTitle}
                        </h3>
                      </div>

                      {match.entryId && (
                        <button
                          onClick={() => onOpenInteraction(match.entryId)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs rounded-lg transition-colors cursor-pointer shrink-0"
                        >
                          <span>Open Entry</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* AI Match Explanation */}
                    <div className="p-2.5 bg-violet-950/20 border border-violet-800/30 rounded-lg text-xs text-violet-200/90 leading-relaxed">
                      <strong className="text-violet-300 block text-[10px] uppercase tracking-wider mb-0.5">
                        Semantic Match Reason:
                      </strong>
                      {match.matchExplanation}
                    </div>

                    {/* Matched Excerpt */}
                    {match.matchedExcerpt && (
                      <blockquote className="border-l-2 border-white/20 pl-3 text-xs italic text-stone-300">
                        "{match.matchedExcerpt}"
                      </blockquote>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
