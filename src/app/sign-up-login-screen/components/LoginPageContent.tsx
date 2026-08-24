'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from './LoginForm';
import SignUpForm from './SignUpForm';
import BrandPanel from './BrandPanel';
import { useAuth } from '@/contexts/AuthContext';

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
    <div className="min-h-screen bg-background flex">
      <BrandPanel />
      <div className="flex-1 flex items-center justify-center px-6 py-12 min-h-screen bg-background">
        <div className="w-full max-w-md space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-6 lg:hidden">
              <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center glow-primary">
                <span className="text-sm font-bold text-white">Z</span>
              </div>
              <span className="font-bold text-lg text-foreground">Zoox</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tighter">
              {mode === 'login' ? (
                <>
                  Welcome <span className="text-shine">Back</span>
                </>
              ) : (
                <>
                  Create <span className="text-shine">Account</span>
                </>
              )}
            </h1>
            <p className="text-sm text-muted-foreground mt-2 font-medium">
              {mode === 'login'
                ? 'Sign in to your Zoox dashboard'
                : 'Join Zoox as a customer to book sessions and track loyalty'}
            </p>
          </div>

          <div className="flex p-1 bg-muted rounded-xl border border-border">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 py-2 rounded-lg text-sm font-bold tracking-tight transition-all duration-200 ${
                mode === 'login'
                  ? 'bg-gradient-to-r from-[#a78bfa] via-primary to-[#6d28d9] text-white shadow-glow-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 rounded-lg text-sm font-bold tracking-tight transition-all duration-200 ${
                mode === 'signup'
                  ? 'bg-gradient-to-r from-[#a78bfa] via-primary to-[#6d28d9] text-white shadow-glow-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign Up
            </button>
          </div>

          {mode === 'login' ? <LoginForm /> : <SignUpForm />}
        </div>
      </div>
    </div>
  );
}
