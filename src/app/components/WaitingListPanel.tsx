'use client';
import React from 'react';
import { Clock, Users, Gamepad2, Bell, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

const waiting = [
  {
    id: 'wl-001',
    customer: 'Amr Khaled',
    phone: '0100-xxx-5512',
    game: 'FC 26',
    players: 2,
    preferredType: 'Standard',
    waitingMin: 18,
    priority: 'normal',
  },
  {
    id: 'wl-002',
    customer: 'Dina Youssef',
    phone: '0112-xxx-3341',
    game: 'GTA V',
    players: 4,
    preferredType: 'Premium',
    waitingMin: 34,
    priority: 'high',
  },
  {
    id: 'wl-003',
    customer: 'Bassem Saad',
    phone: '0115-xxx-9978',
    game: 'Call of Duty',
    players: 2,
    preferredType: 'Standard',
    waitingMin: 47,
    priority: 'normal',
  },
];

export default function WaitingListPanel() {
  const handleNotify = (customer: string) => {
    toast.success(`Notification sent to ${customer}`);
  };

  const handleCheckIn = (customer: string) => {
    toast.success(`${customer} checked in — assign a room from Live Sessions`);
  };

  return (
    <div className="glass-panel rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground">Waiting List</h2>
        <span className="text-xs bg-warning/10 text-warning font-bold px-2 py-0.5 rounded-full">
          {waiting?.length} waiting
        </span>
      </div>
      <div className="space-y-2">
        {waiting?.map((w, idx) => (
          <div
            key={w?.id}
            className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border bg-muted/20 hover:border-border/60 transition-colors group"
          >
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#0a1626] border border-primary/30 flex items-center justify-center">
              <span className="text-xs font-bold font-data-mono text-primary">{idx + 1}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold text-foreground truncate">{w?.customer}</p>
                {w?.priority === 'high' && (
                  <span className="text-xs bg-primary/10 text-primary font-bold px-1 rounded">
                    VIP
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                  <Gamepad2 size={9} /> {w?.game}
                </span>
                <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                  <Users size={9} /> {w?.players}p
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{w?.preferredType}</p>
            </div>
            <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
              <div className="flex items-center gap-0.5 text-warning">
                <Clock size={10} />
                <span className="text-xs font-bold font-tabular">{w?.waitingMin}m</span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  title="Notify customer"
                  onClick={() => handleNotify(w.customer)}
                  className="p-1 rounded-md bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                >
                  <Bell size={11} />
                </button>
                <button
                  title="Check in customer"
                  onClick={() => handleCheckIn(w.customer)}
                  className="p-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <UserCheck size={11} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Link
        href="/waiting-list"
        className="block w-full mt-3 py-2 bg-muted border border-border rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-border/60 transition-colors text-center"
      >
        Manage Waiting List
      </Link>
    </div>
  );
}
