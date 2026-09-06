import React, { useState } from "react";
import { X, CheckCircle2, Shield, Database, Cpu, Lock, Terminal, FileText } from "lucide-react";

interface WalkthroughModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TestCase {
  id: string;
  category: "Auth" | "Firestore" | "Gemini AI" | "Security & Fallback" | "UI / State" | "Advanced Features";
  title: string;
  userSteps: string[];
  expectedResult: string;
}

const TEST_CASES: TestCase[] = [
  {
    id: "TC-AUTH-01",
    category: "Auth",
    title: "Federated Google Sign-In Initiation",
    userSteps: [
      "1. Navigate to the landing page.",
      "2. Click the 'Sign In with Google' or 'Continue with Google' button.",
      "3. Select your Google account in the Firebase Auth popup.",
    ],
    expectedResult:
      "Firebase initiates GoogleAuthProvider popup. Upon token exchange, onAuthStateChanged triggers and switches UI to private user dashboard.",
  },
  {
    id: "TC-AUTH-02",
    category: "Auth",
    title: "Secure Session Sign-Out",
    userSteps: [
      "1. In the Dashboard header, locate the user profile avatar/dropdown.",
      "2. Click the 'Sign Out' button.",
    ],
    expectedResult:
      "Firebase signOut() is called, clearing tokens. UI immediately unmounts private data and redirects back to Landing Page.",
  },
  {
    id: "TC-FS-01",
    category: "Firestore",
    title: "Strict User-Isolated Reflection Persistence",
    userSteps: [
      "1. Inside the Dashboard, click 'New Reflection'.",
      "2. Enter a title or start writing a reflection prompt.",
      "3. Submit the reflection.",
    ],
    expectedResult:
      "Document is written to /users/{userId}/interactions/{interactionId}. Verified that the document path is bound to request.auth.uid, preventing any other user from querying or reading it.",
  },
  {
    id: "TC-FS-02",
    category: "Firestore",
    title: "Multi-Turn Message Subcollection & Transaction Integrity",
    userSteps: [
      "1. On an existing reflection, send a follow-up response or question.",
      "2. Observe the message stream and save indicator.",
    ],
    expectedResult:
      "Both user prompt and AI response are sanitized (stripping undefined properties) and persisted under /users/{userId}/interactions/{id}/messages. Interaction preview and timestamp update atomically.",
  },
  {
    id: "TC-FS-03",
    category: "Firestore",
    title: "Reflection History & Real-Time Loading",
    userSteps: [
      "1. View the left sidebar history panel.",
      "2. Search by title keyword using the search input.",
      "3. Select a previous reflection from the list.",
    ],
    expectedResult:
      "History list dynamically populates past interactions ordered by updatedAt. Selecting loads the exact multi-turn chat history for that entry.",
  },
  {
    id: "TC-FS-04",
    category: "Firestore",
    title: "Deletion of Reflection Entry",
    userSteps: [
      "1. Hover over a reflection in the history sidebar.",
      "2. Click the trash/delete icon and confirm deletion.",
    ],
    expectedResult:
      "Firestore deletes the interaction document. Active view resets cleanly if current entry was deleted.",
  },
  {
    id: "TC-AI-01",
    category: "Gemini AI",
    title: "Multi-Turn Conversational Reflection ('Reflect & Inquire')",
    userSteps: [
      "1. Select 'Reflect & Inquire' mode pill.",
      "2. Type: 'Today I felt overwhelmed juggling multiple deadlines, but I made progress on key milestones.'",
      "3. Click 'Send Reflection'.",
    ],
    expectedResult:
      "Server-side route /api/gemini/reflect calls Gemini 3.6 Flash. AI returns an empathetic reflection identifying underlying tensions and poses 1-2 clarifying inquiry prompts.",
  },
  {
    id: "TC-AI-02",
    category: "Gemini AI",
    title: "Structured Thematic Summarization ('Summarize')",
    userSteps: [
      "1. In the mode selector or action bar, choose 'Summarize Insights'.",
      "2. Click 'Generate Summary' or send the prompt.",
    ],
    expectedResult:
      "Gemini synthesizes the multi-turn context into 3 structured sections: Core Themes, Emotional Undercurrents, and Key Takeaways.",
  },
  {
    id: "TC-AI-03",
    category: "Gemini AI",
    title: "Creative Exploration & Reframing ('Brainstorm')",
    userSteps: [
      "1. Choose 'Brainstorm Ideas' mode.",
      "2. Submit a dilemma or creative question.",
    ],
    expectedResult:
      "Gemini generates 3-4 constructive reframings and actionable journaling exercises.",
  },
  {
    id: "TC-FEAT-02",
    category: "Advanced Features",
    title: "LifeMirror — Long-Term Pattern Discovery",
    userSteps: [
      "1. Click the 'LifeMirror' tab in the navigation bar.",
      "2. Select a focus area filter (e.g. 'All Themes', 'Recurring Frustrations', 'Personal Growth').",
      "3. Click 'Discover Patterns Across Journal'.",
      "4. Inspect surfaced patterns, distinguishing 'Explicit User Quotes' from 'AI Interpretations'.",
      "5. Click 'Jump to Entry' on supporting evidence.",
    ],
    expectedResult:
      "Gemini analyzes all past entries, categorizes recurring themes, presents explicit citations with timestamps, and leaves interpretive synthesis clearly marked without asserting facts.",
  },
  {
    id: "TC-FEAT-03",
    category: "Advanced Features",
    title: "Ask Your Past Self — Archival Q&A with Strict Citations",
    userSteps: [
      "1. Click 'Ask Your Past Self' in the top tab bar.",
      "2. Ask: 'When did I feel most energized recently?' or select a suggested question.",
      "3. Click 'Inquire'.",
    ],
    expectedResult:
      "Gemini uses user entries strictly as ground truth. If insufficient evidence exists, it clearly states 'I don't have enough entries about this'. All answers include exact dates and direct quotes.",
  },
  {
    id: "TC-FEAT-04",
    category: "Advanced Features",
    title: "Decision Journal — Decision Capture & Outcome Retrospective",
    userSteps: [
      "1. Click 'Decision Journal' in the navigation bar.",
      "2. Click 'Record New Decision'.",
      "3. Enter title, options considered, expected outcomes, and confidence level (1-10).",
      "4. Click 'Review Blind Spots' to invoke Gemini Decision Companion without AI making the decision.",
      "5. Save decision to Firestore. Later, click 'Revisit & Record What Happened' to log real outcome.",
    ],
    expectedResult:
      "Decision is saved under /users/{userId}/interactions/{id} with status 'pending'. Retrospective review updates status to 'resolved' with what actually happened and lessons learned.",
  },
  {
    id: "TC-FEAT-05",
    category: "Advanced Features",
    title: "Personal Timeline & Tag Organization",
    userSteps: [
      "1. Click 'Personal Timeline' tab.",
      "2. Browse entries grouped chronologically by month and year.",
      "3. Filter between 'Reflections' and 'Decisions', or filter by tags.",
      "4. Click 'Open Entry' to load directly in the Journal Canvas.",
    ],
    expectedResult:
      "Chronological timeline displays reflections and decisions with confidence badges, tag pills, and month dividers.",
  },
  {
    id: "TC-FEAT-06",
    category: "Advanced Features",
    title: "Intelligent Semantic Journal Search",
    userSteps: [
      "1. Click 'Intelligent Search' tab.",
      "2. Type a natural search: 'Find entries where I talked about burnout or finding purpose'.",
      "3. Click 'Search'.",
    ],
    expectedResult:
      "Gemini semantically matches user reflections, returning relevance percentages, match explanations, and relevant quotes without cross-user leakage.",
  },
  {
    id: "TC-FEAT-07",
    category: "Advanced Features",
    title: "Journal Summaries (Session, Week, Month, Custom)",
    userSteps: [
      "1. Click 'Journal Summaries' tab.",
      "2. Select period: 'Past Week', 'Past Month', 'Custom Range', or 'Individual Session'.",
      "3. Click 'Generate Summary'.",
    ],
    expectedResult:
      "Gemini generates a structured 7-part summary: What Happened, What Mattered, Recurring Themes, Decisions Made, Goals Mentioned, Positive Moments, and Things to Revisit.",
  },
  {
    id: "TC-SEC-01",
    category: "Security & Fallback",
    title: "Resilient Gemini Fallback Ladder Verification",
    userSteps: [
      "1. Review server.ts fallback array [gemini-3.6-flash, gemini-3.1-flash-lite, gemini-flash-latest, gemini-3.7-flash].",
      "2. Trigger an AI generation.",
    ],
    expectedResult:
      "If the primary model is throttled or unavailable (503/429), helper automatically cascades to 3.1-flash-lite or latest without dropping user request.",
  },
  {
    id: "TC-SEC-02",
    category: "Security & Fallback",
    title: "Zero Client-Side API Keys & Secret Hygiene",
    userSteps: [
      "1. Inspect browser Network panel and source bundles.",
      "2. Verify no GEMINI_API_KEY is transmitted or embedded in client code.",
    ],
    expectedResult:
      "Gemini API key is accessed exclusively on the server via process.env.GEMINI_API_KEY. Client only interacts with /api/gemini/reflect proxy.",
  },
  {
    id: "TC-UI-01",
    category: "UI / State",
    title: "Guaranteed Input-to-Save Completeness & Error Toast",
    userSteps: [
      "1. Type a reflection in the textarea.",
      "2. Observe input buffer retention during network transit.",
    ],
    expectedResult:
      "Input is never cleared unless both user and AI entries are verified as written. If network error occurs, clear retry button is presented.",
  },
];

export const WalkthroughModal: React.FC<WalkthroughModalProps> = ({ isOpen, onClose }) => {
  const [activeCategory, setActiveCategory] = useState<string>("All");

  if (!isOpen) return null;

  const categories = ["All", "Advanced Features", "Auth", "Firestore", "Gemini AI", "Security & Fallback", "UI / State"];
  const filteredCases =
    activeCategory === "All"
      ? TEST_CASES
      : TEST_CASES.filter((tc) => tc.category === activeCategory);

  return (
    <div
      id="modal-walkthrough"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div className="bg-[#080808] border border-white/10 rounded-xl shadow-2xl max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden text-[#d6d3d1]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#050505]">
          <div className="flex items-center space-x-2.5">
            <FileText className="w-5 h-5 text-white" />
            <div>
              <h2 className="font-serif text-lg font-normal text-white italic">
                Functional Stability & Test Walkthrough Guide
              </h2>
              <p className="text-xs text-white/40">
                Scenario-by-scenario verification suite mapping each interactive flow to test scripts
              </p>
            </div>
          </div>
          <button
            id="btn-close-walkthrough"
            onClick={onClose}
            className="p-1.5 text-white/40 hover:text-white rounded hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Chips */}
        <div className="px-6 py-2.5 border-b border-white/10 bg-[#080808] flex items-center space-x-2 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-xs uppercase tracking-wider px-3 py-1 rounded transition-colors ${
                activeCategory === cat
                  ? "bg-white text-black font-medium"
                  : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Test Cases List */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-[#050505]">
          {filteredCases.map((tc) => (
            <div
              key={tc.id}
              className="p-4 bg-white/[0.03] rounded-lg border border-white/10 hover:border-white/20 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-2xs font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 text-white/70 border border-white/10">
                    {tc.id}
                  </span>
                  <span className="text-xs font-serif italic px-2 py-0.5 rounded bg-white/5 text-white/90 border border-white/10">
                    {tc.category}
                  </span>
                </div>
                <div className="flex items-center text-emerald-400 text-xs font-mono space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Ready to Verify</span>
                </div>
              </div>

              <h3 className="font-serif text-white text-base mt-2">{tc.title}</h3>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-black/40 rounded border border-white/5">
                  <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold block mb-1">
                    User Steps:
                  </span>
                  <ul className="space-y-1 text-white/70">
                    {tc.userSteps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-3 bg-white/[0.02] rounded border border-white/5">
                  <span className="text-[10px] uppercase tracking-wider text-emerald-400/80 font-semibold block mb-1">
                    Expected Outcome:
                  </span>
                  <p className="text-white/80 leading-relaxed font-light">{tc.expectedResult}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-[#050505] flex items-center justify-between text-xs text-white/40">
          <span>{filteredCases.length} test procedures documented</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white text-black rounded hover:bg-stone-200 transition-colors text-xs uppercase tracking-widest font-medium"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
