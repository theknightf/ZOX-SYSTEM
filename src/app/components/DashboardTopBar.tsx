'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Bell, Download, ChevronDown } from 'lucide-react';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { initialsFor } from '@/lib/demoAccounts';

export default function DashboardTopBar() {
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [query, setQuery] = useState('');
  const router = useRouter();
  const { user } = useAuth();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(query.trim() ? `/customers?q=${encodeURIComponent(query.trim())}` : '/customers');
  };

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now?.toLocaleTimeString('en-EG', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
      setCurrentDate(
        now?.toLocaleDateString('en-EG', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const displayName = user?.name ?? 'Operator';
  const initials = initialsFor(displayName);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="relative flex-1 min-w-[180px] max-w-md">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearch(e);
          }}
          placeholder="Search console ID or customer..."
          className="w-full bg-card border border-border rounded-lg pl-9 pr-3 h-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all duration-150"
        />
      </div>

      <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
        <span className="font-semibold">{currentDate}</span>
        <span className="font-data-mono text-accent font-semibold">{currentTime}</span>
        <ChevronDown size={13} />
      </button>

      <button className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
        <Download size={14} /> Export Report
      </button>

      <div className="ml-auto flex items-center gap-3">
        <button className="relative w-9 h-9 flex items-center justify-center rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground transition-colors active:scale-95">
          <Bell size={17} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary ring-2 ring-[#0b1929]" />
        </button>
        <ThemeToggle />
        <div
          className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-[#6d28d9] flex items-center justify-center text-white text-xs font-bold ring-1 ring-border select-none"
          title={displayName}
        >
          {initials}
        </div>
      </div>
    </div>
  );
}
