import React, { useState } from "react";
import { JournalInteraction } from "../types";
import {
  Calendar,
  Search,
  Filter,
  ExternalLink,
  Scale,
  Sparkles,
  Tag,
  Clock,
  ArrowRight,
  BookOpen,
} from "lucide-react";

interface TimelineViewProps {
  interactions: JournalInteraction[];
  onOpenInteraction: (id: string) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  interactions,
  onOpenInteraction,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [filterType, setFilterType] = useState<"all" | "reflections" | "decisions">("all");

  // Collect all unique tags across entries
  const allTags = Array.from(
    new Set(interactions.flatMap((i) => i.tags || []))
  );

  // Filter interactions
  const filtered = interactions
    .filter((entry) => {
      // Type filter
      if (filterType === "decisions" && (!entry.decision || !entry.decision.isDecision)) return false;
      if (filterType === "reflections" && entry.decision && entry.decision.isDecision) return false;

      // Tag filter
      if (selectedTag !== "all" && (!entry.tags || !entry.tags.includes(selectedTag))) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = entry.title.toLowerCase().includes(q);
        const matchPreview = (entry.preview || "").toLowerCase().includes(q);
        const matchDecision =
          entry.decision?.decisionTitle?.toLowerCase().includes(q) ||
          entry.decision?.expectedOutcome?.toLowerCase().includes(q);
        return matchTitle || matchPreview || Boolean(matchDecision);
      }

      return true;
    })
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  // Group filtered entries by Month & Year (e.g. "September 2026")
  const groupedByMonth: { [key: string]: JournalInteraction[] } = {};
  for (const item of filtered) {
    const date = new Date(item.createdAt || item.updatedAt || Date.now());
    const monthYear = date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    if (!groupedByMonth[monthYear]) {
      groupedByMonth[monthYear] = [];
    }
    groupedByMonth[monthYear].push(item);
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#050505] text-stone-200">
      {/* Top sticky header */}
      <div className="p-6 md:p-8 border-b border-white/5 bg-[#080808]/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase bg-teal-500/10 text-teal-300 border border-teal-500/20">
                Feature 5
              </span>
              <h1 className="text-2xl font-serif tracking-tight text-white flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-teal-400" />
                Memory & Personal Timeline
              </h1>
            </div>
            <p className="mt-1 text-xs text-stone-400 max-w-xl leading-relaxed">
              Chronological journey of your thoughts, reflections, and decisions. Browse by date, search milestones, and open entries directly.
            </p>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-stone-900 border border-white/10 rounded-lg p-1 text-xs">
              <button
                onClick={() => setFilterType("all")}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  filterType === "all" ? "bg-white/10 text-white" : "text-stone-400 hover:text-stone-200"
                }`}
              >
                All ({interactions.length})
              </button>
              <button
                onClick={() => setFilterType("reflections")}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  filterType === "reflections" ? "bg-white/10 text-white" : "text-stone-400 hover:text-stone-200"
                }`}
              >
                Reflections
              </button>
              <button
                onClick={() => setFilterType("decisions")}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  filterType === "decisions" ? "bg-white/10 text-white" : "text-stone-400 hover:text-stone-200"
                }`}
              >
                Decisions
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-5xl mx-auto w-full p-6 md:p-8 space-y-6">
        {/* Search & Tag Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search timeline by keyword, topic, or decision..."
              className="w-full pl-9 pr-4 py-2 bg-stone-900/90 border border-white/10 rounded-lg text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-teal-500/50"
            />
          </div>

          {allTags.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[11px] text-stone-500 uppercase tracking-wider flex items-center gap-1 shrink-0">
                <Tag className="w-3 h-3" />
                Tags:
              </span>
              <button
                onClick={() => setSelectedTag("all")}
                className={`px-2.5 py-1 rounded text-xs cursor-pointer ${
                  selectedTag === "all" ? "bg-white/10 text-white" : "text-stone-400 hover:text-stone-200"
                }`}
              >
                All
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`px-2.5 py-1 rounded text-xs cursor-pointer ${
                    selectedTag === tag ? "bg-white/10 text-white" : "text-stone-400 hover:text-stone-200"
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Timeline Content */}
        {Object.keys(groupedByMonth).length === 0 ? (
          <div className="text-center py-16 text-xs text-stone-500 border border-white/5 rounded-2xl bg-stone-900/10">
            No entries found matching your search criteria.
          </div>
        ) : (
          <div className="space-y-8 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-white/10">
            {Object.entries(groupedByMonth).map(([monthYear, items]) => (
              <div key={monthYear} className="space-y-4 relative pl-8">
                {/* Month marker */}
                <div className="flex items-center gap-2">
                  <div className="absolute left-2 w-3.5 h-3.5 rounded-full bg-teal-500 border-4 border-stone-950" />
                  <span className="text-sm font-serif font-semibold text-teal-300 tracking-wide">
                    {monthYear}
                  </span>
                  <span className="text-xs text-stone-500">({items.length})</span>
                </div>

                {/* Items in this month */}
                <div className="space-y-3">
                  {items.map((entry) => {
                    const isDecision = entry.decision && entry.decision.isDecision;
                    const dateStr = new Date(entry.createdAt).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    });

                    return (
                      <div
                        key={entry.id}
                        className="p-4 rounded-xl border border-white/10 bg-stone-900/50 hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isDecision ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-800/40">
                                <Scale className="w-3 h-3" />
                                Decision
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-stone-800 text-stone-300 border border-white/5">
                                <BookOpen className="w-3 h-3" />
                                Reflection
                              </span>
                            )}
                            <span className="text-[11px] text-stone-500">{dateStr}</span>
                            {entry.decision?.confidenceLevel && (
                              <span className="text-[10px] text-stone-400">
                                Confidence: {entry.decision.confidenceLevel}/10
                              </span>
                            )}
                          </div>

                          <h3 className="text-sm font-serif font-medium text-stone-100 truncate">
                            {entry.title}
                          </h3>

                          <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed">
                            {entry.preview || "No preview recorded."}
                          </p>

                          {entry.tags && entry.tags.length > 0 && (
                            <div className="flex items-center gap-1.5 pt-1">
                              {entry.tags.map((t, tIdx) => (
                                <span
                                  key={tIdx}
                                  className="text-[10px] text-stone-500 bg-white/5 px-2 py-0.5 rounded"
                                >
                                  #{t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => onOpenInteraction(entry.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs rounded-lg transition-colors cursor-pointer"
                          >
                            <span>Open Entry</span>
                            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
