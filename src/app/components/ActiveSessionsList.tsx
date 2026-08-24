'use client';
import React, { useEffect, useState } from 'react';
import { Clock, ShoppingCart, CreditCard, Pause, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export interface ActiveSession {
  id: string;
  room: string;
  roomType: 'Standard' | 'Premium' | 'VIP';
  customer: string;
  phone: string;
  game: string;
  startTime: string;
  startMinutesAgo: number;
  players: number;
  products: number;
  billTotal: number;
  hourlyRate: number;
  sessionType: 'open' | 'fixed';
  fixedDurationMinutes?: number;
}

interface ActiveSessionsListProps {
  sessions: ActiveSession[];
}

function formatElapsed(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m`;
}

const typeColors: Record<string, string> = {
  Standard: 'text-muted-foreground bg-muted',
  Premium: 'text-info bg-info/10',
  VIP: 'text-vip bg-vip/10',
};

export default function ActiveSessionsList({ sessions }: ActiveSessionsListProps) {
  const [elapsed, setElapsed] = useState<Record<string, number>>(
    Object.fromEntries(sessions.map((s) => [s.id, s.startMinutesAgo]))
  );

  useEffect(() => {
    setElapsed(Object.fromEntries(sessions.map((s) => [s.id, s.startMinutesAgo])));
  }, [sessions]);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, v + 1])));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-panel rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Active Sessions</h2>
          <p className="text-xs text-muted-foreground">{sessions.length} sessions running now</p>
        </div>
        <Link
          href="/live-sessions"
          className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
        >
          Manage All <ChevronRight size={14} />
        </Link>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[700px]">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-border bg-[#0a1626]/95 backdrop-blur">
              {[
                'Room',
                'Customer',
                'Game',
                'Elapsed',
                'Players',
                'Products',
                'Bill (EGP)',
                'Actions',
              ].map((h) => (
                <th
                  key={`th-${h}`}
                  className="text-left text-xs font-semibold text-muted-foreground px-4 py-2.5 last:pr-4"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => {
              const elapsedMin = elapsed[session.id] || session.startMinutesAgo;
              const snapshotSessionCost = Math.round(
                (session.startMinutesAgo / 60) * session.hourlyRate
              );
              const productsBill = Math.max(0, session.billTotal - snapshotSessionCost);
              const sessionCost = Math.round((elapsedMin / 60) * session.hourlyRate);
              const total = sessionCost + productsBill;
              const isNearEnd =
                session.sessionType === 'fixed' && session.fixedDurationMinutes
                  ? elapsedMin >= session.fixedDurationMinutes - 10
                  : false;

              return (
                <tr
                  key={session.id}
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors group"
                >
                  <td className="py-3 px-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{session.room}</p>
                      <span
                        className={`text-xs font-medium px-1.5 py-0.5 rounded ${typeColors[session.roomType]}`}
                      >
                        {session.roomType}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-sm font-medium text-foreground">{session.customer}</p>
                    <p className="text-xs text-muted-foreground">{session.phone}</p>
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-sm text-foreground">{session.game}</p>
                    <p className="text-xs text-muted-foreground">
                      {session.sessionType === 'fixed'
                        ? `Fixed ${session.fixedDurationMinutes}min`
                        : 'Open-ended'}
                    </p>
                  </td>
                  <td className="py-3 px-4">
                    <div
                      className={`flex items-center gap-1.5 ${isNearEnd ? 'text-warning' : 'text-accent'}`}
                    >
                      <Clock
                        size={12}
                        className={isNearEnd ? 'text-warning' : 'session-timer-pulse'}
                      />
                      <span className="font-data-mono text-sm font-semibold">
                        {formatElapsed(elapsedMin)}
                      </span>
                    </div>
                    {isNearEnd && <p className="text-xs text-warning">Ending soon</p>}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-foreground font-tabular">{session.players}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-sm font-tabular ${session.products > 0 ? 'text-foreground' : 'text-muted-foreground'}`}
                    >
                      {session.products}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm font-bold font-data-mono text-foreground">
                      {total.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">EGP</span>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        href="/live-sessions"
                        title="Add product"
                        className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      >
                        <ShoppingCart size={13} />
                      </Link>
                      <Link
                        href="/live-sessions"
                        title="Pause session"
                        className="p-1.5 rounded-lg bg-warning/10 text-warning hover:bg-warning/20 transition-colors"
                      >
                        <Pause size={13} />
                      </Link>
                      <Link
                        href="/live-sessions"
                        title="End session & pay"
                        className="p-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                      >
                        <CreditCard size={13} />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
