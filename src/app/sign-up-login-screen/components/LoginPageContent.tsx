'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from './LoginForm';
import SignUpForm from './SignUpForm';
import { useAuth } from '@/contexts/AuthContext';
import ZoxMark from '@/components/ui/ZoxMark';

export default function LoginPageContent() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const router = useRouter();
  const { user, ready, homePath } = useAuth();

  useEffect(() => {
    if (ready && user) {
      router.replace(homePath());
    }
  }, [ready, user, homePath, router]);

  if (ready && user) return null;

  return (
    <div className="relative min-h-screen bg-background flex items-center justify-center px-6 py-12 overflow-hidden">
      {/* Ambient decorative orbs */}
      <div className="pointer-events-none absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent/10 blur-[120px]" />

      <div className="relative z-10 w-full max-w-[440px]">
        <div className="glass-panel hairline-top border border-border rounded-2xl p-8 shadow-premium relative overflow-hidden pop-in">
          {/* Brand header */}
          <div className="flex flex-col items-center mb-8">
            <ZoxMark size={48} className="mb-4" />
            <h1 className="text-3xl font-bold tracking-[0.3em] text-primary glow-primary rounded-lg px-2">
              ZOX
            </h1>
            <p className="text-muted-foreground text-[10px] mt-2.5 uppercase tracking-[0.25em] font-bold">
              Gaming Center OS
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex p-1 bg-card/70 border border-border rounded-xl mb-6">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all duration-200 ${
                mode === 'login'
                  ? 'bg-primary/15 text-primary border border-primary/30 shadow-glow-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Operator Login
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all duration-200 ${
                mode === 'signup'
                  ? 'bg-primary/15 text-primary border border-primary/30 shadow-glow-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              New Account
            </button>
          </div>

          {mode === 'login' ? (
            <div className="fade-in">
              <h2 className="text-lg font-bold text-foreground tracking-tight mb-5">
                Welcome back, <span className="text-shine">Operator</span>
              </h2>
              <LoginForm />
            </div>
          ) : (
            <div className="fade-in">
              <h2 className="text-lg font-bold text-foreground tracking-tight mb-5">
                Create your <span className="text-shine">account</span>
              </h2>
              <SignUpForm />
            </div>
          )}

          {/* Console footer strip */}
          <div className="mt-8 pt-5 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
            <span className="font-data-mono">V 4.2.0-STABLE</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-accent pulse-dot" /> SECURE
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-accent pulse-dot" /> ENCRYPTED
              </span>
            </div>
          </div>
        </div>

        <p className="text-center mt-7 text-muted-foreground text-[10px] font-bold uppercase tracking-[0.22em]">
          The operating system for modern gaming centers
        </p>
      </div>
    </div>
  );
}
