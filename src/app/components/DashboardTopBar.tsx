'use client';
import React, { useState, useEffect } from 'react';
import { Search, Bell, RefreshCw } from 'lucide-react';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function DashboardTopBar() {
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');

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
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <span className="spark-kicker mb-2">✦ Live Operations</span>
        <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tightest text-foreground">
          Staff <span className="text-shine font-black">Dashboard</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5 font-medium">{currentDate}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Quick search customer..."
            className="glass-panel pl-9 w-56 text-sm h-10 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all duration-150 hover:border-primary/40"
          />
        </div>
        <div className="flex items-center gap-2 glass-panel rounded-xl px-3 py-2 glow-hover">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="font-data-mono text-sm font-semibold text-foreground">
            {currentTime}
          </span>
        </div>
        <button className="relative p-2.5 glass-panel rounded-xl text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all duration-150 active:scale-95">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full ring-2 ring-[#0d1c2d]" />
        </button>
        <button className="p-2.5 glass-panel rounded-xl text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all duration-150 active:scale-95">
          <RefreshCw size={18} />
        </button>
        <ThemeToggle />
      </div>
    </div>
  );
}
