'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessRoute, homePathForRole } from '@/lib/auth-guards';

interface AppLayoutProps {
  children: React.ReactNode;
  currentPath: string;
  role?: 'owner' | 'manager' | 'staff' | 'customer';
}

export default function AppLayout({ children, currentPath, role = 'staff' }: AppLayoutProps) {
  const router = useRouter();
  const { user, ready } = useAuth();

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace('/sign-up-login-screen');
      return;
    }
    if (!canAccessRoute(user.role, currentPath)) {
      router.replace(homePathForRole(user.role));
    }
  }, [user, ready, role, currentPath, router]);

  if (!ready) return null;
  if (!user) return null;
  if (!canAccessRoute(user.role, currentPath)) return null;

  return (
    <div className="flex min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="aurora-blob aurora-blob-violet absolute -top-32 -left-32 h-[28rem] w-[28rem] rounded-full" />
        <div className="aurora-blob aurora-blob-emerald absolute top-1/4 -right-28 h-96 w-96 rounded-full" />
      </div>
      <Sidebar currentPath={currentPath} role={role} />
      <main className="relative flex-1 min-w-0 overflow-auto">{children}</main>
    </div>
  );
}
