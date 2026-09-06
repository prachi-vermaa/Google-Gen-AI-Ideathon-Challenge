import React, { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { ShieldCheck, Sparkles, BookOpen, Lock, ArrowRight, AlertCircle, HelpCircle, ExternalLink } from "lucide-react";

interface LandingPageProps {
  onOpenWalkthrough?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenWalkthrough }) => {
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setAuthError(null);
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") {
        // Expected user or iframe-sandbox cancellation - not a system error
        console.info("Google Sign-In popup closed or cancelled by user.");
        setAuthError(
          "Sign-in window was closed. If running inside the preview iframe, click 'Open in New Tab' for direct sign-in."
        );
      } else if (err.code === "auth/popup-blocked") {
        setAuthError(
          "The Google sign-in popup was blocked by your browser. Please allow popups or open the app in a new tab."
        );
      } else {
        console.warn("Sign-in notification:", err?.message || err);
        setAuthError(err.message || "Failed to sign in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#d6d3d1] flex flex-col justify-between relative overflow-hidden">
      {/* Subtle radial aura */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,#1e1e1e,transparent)] pointer-events-none" />

      {/* Top Navigation */}
      <header className="w-full border-b border-white/10 bg-[#050505]/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white/5 border border-white/20 rounded flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            </div>
            <div>
              <span className="font-serif text-xl tracking-wide text-white font-normal">
                Reflection Journal
              </span>
              <span className="hidden sm:inline-block ml-3 text-[10px] uppercase tracking-[0.2em] text-white/40 font-medium px-2 py-0.5 bg-white/5 border border-white/10 rounded">
                Gemini 3.6 &bull; Firestore
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {onOpenWalkthrough && (
              <button
                id="btn-nav-walkthrough"
                onClick={onOpenWalkthrough}
                className="text-xs uppercase tracking-widest text-white/60 hover:text-white px-3 py-1.5 rounded border border-white/10 hover:bg-white/5 transition-colors flex items-center space-x-1.5"
              >
                <HelpCircle className="w-3.5 h-3.5 text-white/40" />
                <span>Test Walkthrough</span>
              </button>
            )}
            <button
              id="btn-header-signin"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="text-xs uppercase tracking-[0.15em] font-medium bg-white hover:bg-stone-200 text-black px-4 py-2 rounded transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? "Authenticating..." : "Sign In with Google"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Hero & Auth Container */}
      <main className="flex-1 max-w-4xl mx-auto px-6 py-20 flex flex-col items-center justify-center text-center relative z-10">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 text-xs font-medium mb-8">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] uppercase tracking-[0.15em]">Strict Owner-Bound Isolation &bull; End-to-End Privacy</span>
        </div>

        <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-normal tracking-tight text-white max-w-3xl leading-tight italic">
          Quiet Thoughts & Guided Reflections
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-white/60 max-w-2xl font-light leading-relaxed">
          Articulate thoughts, unpack daily experiences, and converse with Gemini 3.6 Flash.
          Every journal reflection and AI insight is encrypted and isolated strictly to your account.
        </p>

        {authError && (
          <div
            id="auth-error-banner"
            className="mt-6 max-w-md w-full p-4 bg-rose-950/40 border border-rose-800/60 rounded-lg text-left text-sm text-rose-200 flex items-start space-x-3"
          >
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-xs uppercase tracking-wider text-rose-300">Authentication Notice</p>
              <p className="mt-1 text-rose-200/80 text-xs leading-relaxed">{authError}</p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  id="btn-open-new-tab"
                  onClick={() => window.open(window.location.href, "_blank")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-[11px] uppercase tracking-wider text-white transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in New Tab</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Primary Call to Action */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <button
            id="btn-main-google-login"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-stone-200 text-black text-xs font-semibold uppercase tracking-[0.18em] rounded shadow-md transition-all flex items-center justify-center space-x-3 disabled:opacity-60 group cursor-pointer"
          >
            {/* Google Icon SVG */}
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>{loading ? "Authenticating..." : "Continue with Google"}</span>
            <ArrowRight className="w-3.5 h-3.5 text-black group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Value Pillars */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 text-left w-full">
          <div className="p-6 bg-[#080808] rounded-xl border border-white/10 hover:border-white/20 transition-colors">
            <div className="w-9 h-9 rounded bg-white/5 border border-white/10 text-white flex items-center justify-center mb-4">
              <Lock className="w-4 h-4 text-white/70" />
            </div>
            <h3 className="font-serif text-lg font-medium text-white">User Data Isolation</h3>
            <p className="mt-2 text-sm text-white/50 leading-relaxed">
              Enforced by strict Firestore security rules (`request.auth.uid == userId`). No user can ever access or query another person&apos;s reflections.
            </p>
          </div>

          <div className="p-6 bg-[#080808] rounded-xl border border-white/10 hover:border-white/20 transition-colors">
            <div className="w-9 h-9 rounded bg-white/5 border border-white/10 text-white flex items-center justify-center mb-4">
              <Sparkles className="w-4 h-4 text-white/70" />
            </div>
            <h3 className="font-serif text-lg font-medium text-white">Gemini 3.6 Fallback Ladder</h3>
            <p className="mt-2 text-sm text-white/50 leading-relaxed">
              Multi-tiered model resilience: queries automatically cascade through 3.6 Flash, 3.1 Flash-Lite, and 3.7 Flash to guarantee response continuity.
            </p>
          </div>

          <div className="p-6 bg-[#080808] rounded-xl border border-white/10 hover:border-white/20 transition-colors">
            <div className="w-9 h-9 rounded bg-white/5 border border-white/10 text-white flex items-center justify-center mb-4">
              <BookOpen className="w-4 h-4 text-white/70" />
            </div>
            <h3 className="font-serif text-lg font-medium text-white">Multi-Turn Reflections</h3>
            <p className="mt-2 text-sm text-white/50 leading-relaxed">
              Explore your thoughts through conversational journaling. Switch dynamically between deep inquiry, thematic summarization, and creative brainstorming.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/10 py-6 text-center text-[10px] uppercase tracking-[0.15em] text-white/30 bg-[#050505]">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Reflection Journal &bull; Built with Google GenAI & Firebase Cloud Firestore</span>
          <span>Zero Credential Storage &bull; Federated Google Identity</span>
        </div>
      </footer>
    </div>
  );
};
