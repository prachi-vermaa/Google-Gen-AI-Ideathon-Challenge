import React, { useState, useEffect, useRef } from "react";
import { User, signOut } from "firebase/auth";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { auth, db, sanitizePayload } from "../firebase";
import { ChatMessage, JournalInteraction, ReflectionMode, DashboardActiveView } from "../types";
import Markdown from "react-markdown";
import {
  Sparkles,
  Plus,
  Trash2,
  ArrowUp,
  HelpCircle,
  LogOut,
  Search,
  BookOpen,
  Check,
  Copy,
  AlertCircle,
  Menu,
  X,
  FileText,
  Lightbulb,
  RefreshCw,
  Scale,
  Calendar,
  History,
  ShieldCheck,
} from "lucide-react";
import { LifeMirrorView } from "./LifeMirrorView";
import { AskPastSelfView } from "./AskPastSelfView";
import { DecisionJournalView } from "./DecisionJournalView";
import { TimelineView } from "./TimelineView";
import { IntelligentSearchView } from "./IntelligentSearchView";
import { JournalSummariesView } from "./JournalSummariesView";

interface DashboardProps {
  user: User;
  onOpenWalkthrough: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onOpenWalkthrough }) => {
  const [interactions, setInteractions] = useState<JournalInteraction[]>([]);
  const [activeInteractionId, setActiveInteractionId] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>("");
  const [mode, setMode] = useState<ReflectionMode>("reflect");
  const [activeView, setActiveView] = useState<DashboardActiveView>("journal");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Subscribe to user-isolated interactions list: /users/{userId}/interactions
  useEffect(() => {
    if (!user.uid) return;

    const interactionsRef = collection(db, "users", user.uid, "interactions");
    const q = query(interactionsRef, orderBy("updatedAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: JournalInteraction[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            title: data.title || "Untitled Reflection",
            userId: user.uid,
            createdAt: data.createdAt || Date.now(),
            updatedAt: data.updatedAt || Date.now(),
            preview: data.preview || "",
            messageCount: data.messageCount || 0,
            tags: data.tags || [],
            mood: data.mood || "",
            latestSummary: data.latestSummary || "",
          });
        });
        setInteractions(list);

        // Auto-select first interaction if none selected
        if (!activeInteractionId && list.length > 0) {
          setActiveInteractionId(list[0].id);
          setActiveTitle(list[0].title);
        }
      },
      (err) => {
        console.warn("Interactions subscription notice:", err?.message || err);
        setSaveError("Failed to fetch reflection history. Please check your network.");
      }
    );

    return () => unsubscribe();
  }, [user.uid, activeInteractionId]);

  // 2. Subscribe to messages subcollection for the active interaction
  useEffect(() => {
    if (!user.uid || !activeInteractionId) {
      setMessages([]);
      return;
    }

    const messagesRef = collection(
      db,
      "users",
      user.uid,
      "interactions",
      activeInteractionId,
      "messages"
    );
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs: ChatMessage[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          msgs.push({
            id: docSnap.id,
            role: d.role,
            content: d.content,
            timestamp: d.timestamp,
            modelUsed: d.modelUsed,
            mode: d.mode,
          });
        });
        setMessages(msgs);
      },
      (err) => {
        console.warn("Messages subscription notice:", err?.message || err);
      }
    );

    return () => unsubscribe();
  }, [user.uid, activeInteractionId]);

  // Auto-scroll messages to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  // Create new reflection session
  const handleNewReflection = () => {
    const newId = `ref_${Date.now()}`;
    setActiveInteractionId(newId);
    setActiveTitle("New Reflection");
    setMessages([]);
    setInputText("");
    setSaveError(null);
    setActiveView("journal");
    setSidebarOpen(false);
  };

  // Delete an interaction
  const handleDeleteInteraction = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this reflection and all its entries?")) {
      return;
    }
    try {
      await deleteDoc(doc(db, "users", user.uid, "interactions", id));
      if (activeInteractionId === id) {
        const remaining = interactions.filter((i) => i.id !== id);
        if (remaining.length > 0) {
          setActiveInteractionId(remaining[0].id);
          setActiveTitle(remaining[0].title);
        } else {
          setActiveInteractionId(null);
          setActiveTitle("");
          setMessages([]);
        }
      }
    } catch (err: any) {
      console.error("Error deleting interaction:", err);
      setSaveError("Failed to delete reflection. " + (err.message || ""));
    }
  };

  // Copy message text
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  // Submit Reflection to Gemini and Persist to Firestore
  const handleSendReflection = async (customPrompt?: string, overrideMode?: ReflectionMode) => {
    const promptToSend = (customPrompt ?? inputText).trim();
    if (!promptToSend && messages.length === 0) return;

    const currentMode = overrideMode || mode;
    const interactionId = activeInteractionId || `ref_${Date.now()}`;
    if (!activeInteractionId) {
      setActiveInteractionId(interactionId);
    }

    setIsGenerating(true);
    setIsSaving(true);
    setSaveError(null);

    // Prepare User Message
    const userMsgId = `msg_user_${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMsgId,
      role: "user",
      content: promptToSend,
      timestamp: Date.now(),
      mode: currentMode,
    };

    // Keep temporary buffer in case network fails
    const originalInput = inputText;
    setInputText("");

    try {
      // 1. Persist User Message to Firestore (strictly sanitized)
      const userMsgRef = doc(
        db,
        "users",
        user.uid,
        "interactions",
        interactionId,
        "messages",
        userMsgId
      );
      await setDoc(userMsgRef, sanitizePayload(userMessage));

      // Calculate initial title if untitled
      const titleToUse =
        activeTitle && activeTitle !== "New Reflection" && activeTitle !== "Untitled Reflection"
          ? activeTitle
          : promptToSend.slice(0, 42).replace(/\n/g, " ") + (promptToSend.length > 42 ? "..." : "");

      // 2. Call Server-Side Gemini API Proxy (/api/gemini/reflect)
      const res = await fetch("/api/gemini/reflect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptToSend,
          mode: currentMode,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
          title: titleToUse,
          userId: user.uid,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${res.status}`);
      }

      const data = await res.json();
      const aiText = data.text || "No response received from model.";
      const modelUsed = data.modelUsed || "gemini-3.6-flash";

      // 3. Persist AI Message to Firestore
      const aiMsgId = `msg_ai_${Date.now()}`;
      const aiMessage: ChatMessage = {
        id: aiMsgId,
        role: "assistant",
        content: aiText,
        timestamp: Date.now(),
        modelUsed,
        mode: currentMode,
      };

      const aiMsgRef = doc(
        db,
        "users",
        user.uid,
        "interactions",
        interactionId,
        "messages",
        aiMsgId
      );
      await setDoc(aiMsgRef, sanitizePayload(aiMessage));

      // 4. Update Parent Interaction Document in Firestore
      const interactionRef = doc(db, "users", user.uid, "interactions", interactionId);
      const interactionPayload: Partial<JournalInteraction> = {
        id: interactionId,
        title: titleToUse,
        userId: user.uid,
        updatedAt: Date.now(),
        createdAt: messages.length === 0 ? Date.now() : undefined,
        preview: promptToSend.slice(0, 100),
        messageCount: messages.length + 2,
        mood: currentMode,
        latestSummary: currentMode === "summarize" ? aiText.slice(0, 160) : undefined,
      };

      await setDoc(interactionRef, sanitizePayload(interactionPayload), { merge: true });
      setActiveTitle(titleToUse);
      setIsSaving(false);
    } catch (err: any) {
      console.warn("Reflection pipeline notice:", err?.message || err);
      // Restore input buffer so user never loses their writing
      setInputText(originalInput);
      setSaveError(err.message || "Failed to process reflection. Your text was preserved.");
      setIsSaving(false);
    } finally {
      setIsGenerating(false);
    }
  };

  // Update title in Firestore
  const handleTitleBlur = async () => {
    if (!activeInteractionId || !activeTitle.trim()) return;
    try {
      const interactionRef = doc(db, "users", user.uid, "interactions", activeInteractionId);
      await setDoc(
        interactionRef,
        sanitizePayload({ title: activeTitle.trim(), updatedAt: Date.now() }),
        { merge: true }
      );
    } catch (err) {
      console.warn("Title update notice:", err);
    }
  };

  // Filtered past reflections
  const filteredInteractions = interactions.filter((i) =>
    i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.preview.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-screen w-full bg-[#050505] text-[#d6d3d1] font-sans flex flex-col overflow-hidden antialiased">
      {/* Top Navbar */}
      <nav className="h-16 border-b border-white/10 flex items-center justify-between px-4 sm:px-8 bg-[#050505] shrink-0 z-30">
        <div className="flex items-center gap-3">
          <button
            id="btn-sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-1.5 rounded text-white/70 hover:bg-white/5 border border-white/10"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/5 border border-white/20 rounded flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            </div>
            <span className="font-serif text-xl tracking-wide text-white">Reflection Journal</span>
          </div>
        </div>

        {/* Right Nav Controls */}
        <div className="flex items-center gap-3 sm:gap-6">
          <button
            id="btn-open-walkthrough"
            onClick={onOpenWalkthrough}
            className="text-xs uppercase tracking-widest text-white/50 hover:text-white px-2.5 py-1 rounded border border-white/10 hover:bg-white/5 transition-colors flex items-center gap-1.5"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Test Walkthrough</span>
          </button>

          <button
            id="btn-new-reflection-top"
            onClick={handleNewReflection}
            className="hidden sm:flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-white/80 hover:text-white px-3 py-1.5 rounded border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Reflection</span>
          </button>

          {/* User profile & Sign Out */}
          <div className="flex items-center gap-3 border-l border-white/10 pl-3 sm:pl-6">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || "User"}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full border border-white/20 object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-stone-500 to-stone-800 border border-white/20 text-white flex items-center justify-center text-xs font-serif font-medium">
                {(user.displayName || user.email || "U")[0].toUpperCase()}
              </div>
            )}
            <span className="text-sm font-medium text-white/90 hidden lg:inline max-w-[130px] truncate">
              {user.displayName || user.email}
            </span>
            <button
              id="btn-signout"
              onClick={() => signOut(auth)}
              title="Sign Out"
              className="p-1.5 text-white/40 hover:text-white hover:bg-white/5 rounded transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Sub-Navigation for the 7 Features */}
      <div className="h-11 border-b border-white/10 bg-[#070707] flex items-center px-4 sm:px-8 gap-1.5 overflow-x-auto text-xs shrink-0 z-20">
        <button
          id="nav-tab-journal"
          onClick={() => setActiveView("journal")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-colors whitespace-nowrap cursor-pointer ${
            activeView === "journal"
              ? "bg-white/10 text-white border border-white/20"
              : "text-stone-400 hover:text-stone-200 hover:bg-white/5"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Journal Canvas</span>
        </button>

        <button
          id="nav-tab-lifemirror"
          onClick={() => setActiveView("lifemirror")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-colors whitespace-nowrap cursor-pointer ${
            activeView === "lifemirror"
              ? "bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold"
              : "text-stone-400 hover:text-stone-200 hover:bg-white/5"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>LifeMirror</span>
        </button>

        <button
          id="nav-tab-ask-past-self"
          onClick={() => setActiveView("ask-past-self")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-colors whitespace-nowrap cursor-pointer ${
            activeView === "ask-past-self"
              ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-semibold"
              : "text-stone-400 hover:text-stone-200 hover:bg-white/5"
          }`}
        >
          <History className="w-3.5 h-3.5 text-indigo-400" />
          <span>Ask Your Past Self</span>
        </button>

        <button
          id="nav-tab-decisions"
          onClick={() => setActiveView("decisions")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-colors whitespace-nowrap cursor-pointer ${
            activeView === "decisions"
              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold"
              : "text-stone-400 hover:text-stone-200 hover:bg-white/5"
          }`}
        >
          <Scale className="w-3.5 h-3.5 text-emerald-400" />
          <span>Decision Journal</span>
        </button>

        <button
          id="nav-tab-timeline"
          onClick={() => setActiveView("timeline")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-colors whitespace-nowrap cursor-pointer ${
            activeView === "timeline"
              ? "bg-teal-500/15 text-teal-300 border border-teal-500/30 font-semibold"
              : "text-stone-400 hover:text-stone-200 hover:bg-white/5"
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-teal-400" />
          <span>Personal Timeline</span>
        </button>

        <button
          id="nav-tab-search"
          onClick={() => setActiveView("search")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-colors whitespace-nowrap cursor-pointer ${
            activeView === "search"
              ? "bg-violet-500/15 text-violet-300 border border-violet-500/30 font-semibold"
              : "text-stone-400 hover:text-stone-200 hover:bg-white/5"
          }`}
        >
          <Search className="w-3.5 h-3.5 text-violet-400" />
          <span>Intelligent Search</span>
        </button>

        <button
          id="nav-tab-summaries"
          onClick={() => setActiveView("summaries")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-colors whitespace-nowrap cursor-pointer ${
            activeView === "summaries"
              ? "bg-rose-500/15 text-rose-300 border border-rose-500/30 font-semibold"
              : "text-stone-400 hover:text-stone-200 hover:bg-white/5"
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-rose-400" />
          <span>Journal Summaries</span>
        </button>
      </div>

      {/* Feature Views Switcher */}
      {activeView === "lifemirror" && (
        <LifeMirrorView
          interactions={interactions}
          onOpenInteraction={(id) => {
            setActiveInteractionId(id);
            setActiveView("journal");
          }}
          userId={user.uid}
        />
      )}

      {activeView === "ask-past-self" && (
        <AskPastSelfView
          interactions={interactions}
          onOpenInteraction={(id) => {
            setActiveInteractionId(id);
            setActiveView("journal");
          }}
          userId={user.uid}
        />
      )}

      {activeView === "decisions" && (
        <DecisionJournalView
          interactions={interactions}
          onOpenInteraction={(id) => {
            setActiveInteractionId(id);
            setActiveView("journal");
          }}
          userId={user.uid}
        />
      )}

      {activeView === "timeline" && (
        <TimelineView
          interactions={interactions}
          onOpenInteraction={(id) => {
            setActiveInteractionId(id);
            setActiveView("journal");
          }}
        />
      )}

      {activeView === "search" && (
        <IntelligentSearchView
          interactions={interactions}
          onOpenInteraction={(id) => {
            setActiveInteractionId(id);
            setActiveView("journal");
          }}
          userId={user.uid}
        />
      )}

      {activeView === "summaries" && (
        <JournalSummariesView
          interactions={interactions}
          userId={user.uid}
        />
      )}

      {/* Main Container: Sidebar + Active Canvas (Shown when in journal view) */}
      {activeView === "journal" && (
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar: Past Sessions */}
        <aside
          className={`fixed md:static inset-y-16 md:inset-y-0 left-0 z-20 w-72 border-r border-white/10 flex flex-col bg-[#080808] transition-transform duration-200 ease-in-out ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          {/* New Reflection Button */}
          <div className="p-5 pb-3">
            <button
              id="btn-sidebar-new-reflection"
              onClick={handleNewReflection}
              className="w-full py-3 border border-white/10 rounded bg-white/5 hover:bg-white/10 text-xs uppercase tracking-[0.2em] text-white transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Reflection</span>
            </button>
          </div>

          {/* Search */}
          <div className="px-5 pb-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-white/30" />
              <input
                id="input-history-search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search reflections..."
                className="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto px-4 space-y-1.5">
            <div className="flex items-center justify-between px-2 pt-2 mb-2">
              <h3 className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold">
                Past Sessions
              </h3>
              <span className="text-[10px] text-white/20 font-mono">{filteredInteractions.length}</span>
            </div>

            {filteredInteractions.length === 0 ? (
              <div className="p-6 text-center text-white/30 text-xs">
                <BookOpen className="w-6 h-6 mx-auto mb-2 opacity-30" />
                <p className="font-serif italic">No reflections recorded yet.</p>
              </div>
            ) : (
              filteredInteractions.map((item) => (
                <div
                  key={item.id}
                  id={`item-reflection-${item.id}`}
                  onClick={() => {
                    setActiveInteractionId(item.id);
                    setActiveTitle(item.title);
                    setSidebarOpen(false);
                  }}
                  className={`group p-3 rounded-lg border text-left cursor-pointer transition-colors relative ${
                    activeInteractionId === item.id
                      ? "bg-white/5 border-white/20 text-white"
                      : "border-transparent hover:border-white/10 hover:bg-white/5 text-white/80"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="text-sm font-serif truncate max-w-[170px] text-white">
                      {item.title}
                    </div>
                    <button
                      title="Delete reflection"
                      onClick={(e) => handleDeleteInteraction(item.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-white/30 hover:text-rose-400 hover:bg-white/10 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {item.preview && (
                    <div className="text-xs text-white/40 line-clamp-1 mt-1 font-serif italic">
                      {item.preview}
                    </div>
                  )}

                  <div className="text-[10px] text-white/30 mt-1 uppercase tracking-wider flex items-center justify-between">
                    <span>
                      {new Date(item.updatedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className="font-mono text-white/20">{item.messageCount || 0} msgs</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-white/5">
            <div className="text-[10px] text-center text-white/30 uppercase tracking-[0.18em]">
              Firestore Protected
            </div>
          </div>
        </aside>

        {/* Main Canvas: Quiet Thoughts & Active Reflection */}
        <main className="flex-1 flex flex-col bg-[#050505] relative overflow-hidden">
          {/* Subtle Radial Aura */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,#1a1a1a,transparent)] pointer-events-none" />

          {/* Active Canvas Header */}
          <div className="h-16 px-6 sm:px-12 border-b border-white/10 flex items-center justify-between gap-4 bg-[#050505]/60 backdrop-blur-xs relative z-10 shrink-0">
            <div className="flex-1 min-w-[200px]">
              <input
                id="input-reflection-title"
                type="text"
                value={activeTitle}
                onChange={(e) => setActiveTitle(e.target.value)}
                onBlur={handleTitleBlur}
                placeholder="Title your reflection..."
                className="font-serif text-xl sm:text-2xl text-white italic bg-transparent border-b border-transparent hover:border-white/20 focus:border-white/40 focus:outline-none w-full py-0.5 transition-colors placeholder-white/20"
              />
            </div>

            {/* Mode Selectors */}
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10 text-xs">
              <button
                id="btn-mode-reflect"
                onClick={() => setMode("reflect")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] uppercase tracking-wider font-medium transition-all ${
                  mode === "reflect"
                    ? "bg-white text-black shadow-xs"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>Reflect</span>
              </button>

              <button
                id="btn-mode-summarize"
                onClick={() => setMode("summarize")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] uppercase tracking-wider font-medium transition-all ${
                  mode === "summarize"
                    ? "bg-white text-black shadow-xs"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
              >
                <FileText className="w-3 h-3" />
                <span>Summarize</span>
              </button>

              <button
                id="btn-mode-brainstorm"
                onClick={() => setMode("brainstorm")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] uppercase tracking-wider font-medium transition-all ${
                  mode === "brainstorm"
                    ? "bg-white text-black shadow-xs"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
              >
                <Lightbulb className="w-3 h-3" />
                <span>Brainstorm</span>
              </button>
            </div>
          </div>

          {/* Error Banner with Retry */}
          {saveError && (
            <div
              id="banner-save-error"
              className="px-6 py-2.5 bg-rose-950/40 border-b border-rose-800/60 text-xs text-rose-200 flex items-center justify-between relative z-10"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{saveError}</span>
              </div>
              <button
                onClick={() => handleSendReflection()}
                className="px-2.5 py-1 bg-rose-800 hover:bg-rose-700 text-white rounded text-[10px] uppercase tracking-widest font-medium transition-colors flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* Conversation & Journal Reflections Scroll Area */}
          <div className="flex-1 overflow-y-auto px-6 sm:px-12 py-8 relative z-10">
            <div className="max-w-2xl mx-auto space-y-10">
              {/* Header Hero when beginning reflection */}
              {messages.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <h2 className="font-serif text-3xl sm:text-4xl text-white italic">Quiet Thoughts</h2>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                    Synchronized with Gemini 3.6 &bull; Encrypted in Firestore
                  </p>

                  <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-lg mx-auto pt-4">
                    {[
                      "The weight of stillness and choices...",
                      "Architectural patterns and focus...",
                      "What energized or drained my day?",
                      "Untangling a dilemma with honesty...",
                    ].map((starter, i) => (
                      <button
                        key={i}
                        onClick={() => setInputText(starter)}
                        className="p-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-white/70 hover:text-white transition-colors font-serif italic text-left"
                      >
                        &ldquo;{starter}&rdquo;
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Message Stream */}
              {messages.map((msg) =>
                msg.role === "user" ? (
                  /* User Reflection Prompt */
                  <div key={msg.id} id={`message-${msg.id}`} className="flex gap-4 sm:gap-6 items-start">
                    <div className="w-10 h-10 rounded-full border border-white/10 flex-shrink-0 flex items-center justify-center text-xs text-white/50 bg-white/5">
                      {(user.displayName || user.email || "U")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="text-white/95 leading-relaxed text-base sm:text-lg font-serif whitespace-pre-wrap">
                        {msg.content}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-white/30 uppercase tracking-widest">
                        <span>
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span>&bull;</span>
                        <span>Private Entry</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Gemini Response */
                  <div key={msg.id} id={`message-${msg.id}`} className="flex gap-4 sm:gap-6 items-start">
                    <div className="w-10 h-10 rounded-full bg-white/5 border border-white/20 flex-shrink-0 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-amber-200 rounded-full blur-[1px]" />
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="text-[#a8a29e] leading-relaxed italic border-l border-white/10 pl-6 text-base sm:text-lg font-serif prose prose-invert prose-stone max-w-none">
                        <Markdown>{msg.content}</Markdown>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 pt-1">
                        <span className="px-3 py-1 bg-white/5 border border-white/10 rounded text-[10px] uppercase tracking-widest text-white/40">
                          {msg.modelUsed || "gemini-3.6-flash"}
                        </span>
                        {msg.mode && (
                          <span className="px-3 py-1 bg-white/5 border border-white/10 rounded text-[10px] uppercase tracking-widest text-white/40 capitalize">
                            {msg.mode}
                          </span>
                        )}
                        <button
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="px-3 py-1 bg-white/5 border border-white/10 rounded text-[10px] uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1"
                        >
                          {copiedMessageId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )}

              {/* Generating Animation */}
              {isGenerating && (
                <div className="flex gap-4 sm:gap-6 items-start">
                  <div className="w-10 h-10 rounded-full bg-white/5 border border-white/20 flex-shrink-0 flex items-center justify-center">
                    <div className="w-2 h-2 bg-amber-200 rounded-full animate-ping" />
                  </div>
                  <div className="flex-1 space-y-2 border-l border-white/10 pl-6">
                    <p className="text-white/40 font-serif italic text-base animate-pulse">
                      Gemini 3.6 is contemplating your reflection...
                    </p>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Bottom Reflection Input Dock */}
          <div className="border-t border-white/10 flex flex-col justify-center px-4 sm:px-12 py-4 bg-[#080808]/70 backdrop-blur-xl relative z-20 shrink-0">
            <div className="max-w-2xl mx-auto w-full relative">
              <textarea
                id="textarea-reflection-input"
                rows={2}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    handleSendReflection();
                  }
                }}
                placeholder="Describe your reflection... (Ctrl/Cmd + Enter to send)"
                className="w-full bg-transparent border border-white/10 rounded-xl px-5 py-3 pr-14 text-white placeholder-white/20 focus:outline-none focus:border-white/30 resize-none text-sm font-sans leading-relaxed"
              />

              <button
                id="btn-send-reflection"
                onClick={() => handleSendReflection()}
                disabled={isGenerating || (!inputText.trim() && messages.length === 0)}
                className="absolute right-3.5 bottom-4 w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:bg-stone-200 transition-colors disabled:opacity-30 cursor-pointer shadow-sm"
              >
                <ArrowUp className="w-4 h-4 text-black stroke-[2.5]" />
              </button>
            </div>

            {/* Quick action chips & status */}
            <div className="max-w-2xl mx-auto w-full flex items-center justify-between pt-2 px-1 text-[10px] uppercase tracking-widest text-white/30">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSendReflection(undefined, "reflect")}
                  disabled={isGenerating || (!inputText.trim() && messages.length === 0)}
                  className="hover:text-white transition-colors disabled:opacity-30"
                >
                  Reflect
                </button>
                <span>&bull;</span>
                <button
                  onClick={() => handleSendReflection("Please summarize the main themes and insights of this session.", "summarize")}
                  disabled={isGenerating || messages.length === 0}
                  className="hover:text-white transition-colors disabled:opacity-30"
                >
                  Summarize Session
                </button>
                <span>&bull;</span>
                <button
                  onClick={() => handleSendReflection("Brainstorm fresh perspectives and next steps.", "brainstorm")}
                  disabled={isGenerating || (!inputText.trim() && messages.length === 0)}
                  className="hover:text-white transition-colors disabled:opacity-30"
                >
                  Brainstorm Ideas
                </button>
              </div>

              <span className="hidden sm:inline font-mono">
                {isSaving ? "Saving to Firestore..." : "Firestore Isolated"}
              </span>
            </div>
          </div>
        </main>
      </div>
      )}
    </div>
  );
};
