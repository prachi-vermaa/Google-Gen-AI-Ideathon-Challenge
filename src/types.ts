export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export type ReflectionMode = "reflect" | "summarize" | "brainstorm" | "converse";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  modelUsed?: string;
  mode?: ReflectionMode;
}

export interface DecisionData {
  isDecision: boolean;
  decisionTitle: string;
  date: number;
  context: string;
  optionsConsidered: string[];
  reasons: string;
  expectedOutcome: string;
  concerns: string;
  confidenceLevel: number; // 1 to 10
  // Retrospective outcome review:
  outcomeReviewedAt?: number;
  whatActuallyHappened?: string;
  whatWentWell?: string;
  whatWentDifferently?: string;
  whatTheyLearned?: string;
  status: "pending" | "resolved" | "revisiting";
}

export interface JournalInteraction {
  id: string;
  title: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
  preview: string;
  messageCount: number;
  tags?: string[];
  mood?: string;
  latestSummary?: string;
  decision?: DecisionData;
}

// LifeMirror: Long-Term Pattern Discovery
export interface LifeMirrorPattern {
  id: string;
  category: "topics" | "concerns" | "goals" | "joy" | "frustrations" | "priorities" | "situations" | "growth";
  title: string;
  explicitEvidence: {
    entryId: string;
    entryTitle: string;
    date: string;
    quote: string;
  }[];
  aiInterpretation: string; // explicitly marked as reflective hypothesis
  confidence: "high" | "medium" | "emerging";
}

// Ask Your Past Self
export interface PastSelfCitation {
  entryId: string;
  entryTitle: string;
  date: string;
  relevantExcerpt: string;
}

export interface PastSelfResponse {
  answer: string;
  hasEnoughInfo: boolean;
  citations: PastSelfCitation[];
  modelUsed?: string;
}

// Intelligent Journal Search
export interface SearchMatch {
  entryId: string;
  entryTitle: string;
  date: string;
  relevanceScore: number;
  matchExplanation: string;
  matchedExcerpt: string;
}

// Journal Summaries
export interface PeriodSummaryData {
  periodType: "session" | "week" | "month" | "custom";
  periodLabel: string;
  generatedAt: number;
  entryCount: number;
  whatHappened: string;
  whatMattered: string;
  recurringThemes: string[];
  decisions: string[];
  goalsMentioned: string[];
  positiveMoments: string[];
  thingsToRevisit: string[];
  modelUsed?: string;
}

export type DashboardActiveView =
  | "journal"
  | "lifemirror"
  | "ask-past-self"
  | "decisions"
  | "timeline"
  | "search"
  | "summaries";
