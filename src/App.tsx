import React, { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "./firebase";
import { LandingPage } from "./components/LandingPage";
import { Dashboard } from "./components/Dashboard";
import { WalkthroughModal } from "./components/WalkthroughModal";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [isWalkthroughOpen, setIsWalkthroughOpen] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthChecking(false);
    });

    return () => unsubscribe();
  }, []);

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-[#d6d3d1]">
        <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/20 text-white flex items-center justify-center font-serif text-lg mb-4 shadow-sm">
          <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
        </div>
        <div className="flex items-center space-x-2 text-xs uppercase tracking-[0.2em] font-medium text-white/50">
          <span>Verifying secure session</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#d6d3d1] font-sans selection:bg-white/20 selection:text-white">
      {currentUser ? (
        <Dashboard
          user={currentUser}
          onOpenWalkthrough={() => setIsWalkthroughOpen(true)}
        />
      ) : (
        <LandingPage onOpenWalkthrough={() => setIsWalkthroughOpen(true)} />
      )}

      {/* Test Walkthrough Modal */}
      <WalkthroughModal
        isOpen={isWalkthroughOpen}
        onClose={() => setIsWalkthroughOpen(false)}
      />
    </div>
  );
}
