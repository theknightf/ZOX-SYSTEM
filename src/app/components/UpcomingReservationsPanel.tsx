import React from 'react';
import { CalendarClock, Users } from 'lucide-react';
import Link from 'next/link';

const upcoming = [
  {
    id: 'res-up-001',
    customer: 'Tarek Samir',
    room: 'Room 3',
    game: 'Call of Duty',
    time: '16:00',
    players: 2,
    minutesUntil: 23,
  },
  {
    id: 'res-up-002',
    customer: 'Nour Ibrahim',
    room: 'Room 5',
    game: 'FC 26',
    time: '16:15',
    players: 4,
    minutesUntil: 38,
  },
  {
    id: 'res-up-003',
    customer: 'Walid Hassan',
    room: 'Room 8',
    game: 'GTA V',
    time: '16:30',
    players: 6,
    minutesUntil: 53,
  },
  {
    id: 'res-up-004',
    customer: 'Rana Mostafa',
    room: 'Room 1',
    game: 'FC 26',
    time: '17:00',
    players: 2,
    minutesUntil: 83,
  },
  {
    id: 'res-up-005',
    customer: 'Samy Adel',
    room: 'Room 6',
    game: 'PES 2024',
    time: '17:30',
    players: 2,
    minutesUntil: 113,
  },
];

export default function UpcomingReservationsPanel() {
  return (
    <div className="glass-panel rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Upcoming Reservations</h2>
        <Link href="/reservations">
          <span className="text-xs text-primary font-semibold hover:underline cursor-pointer">
            View all
          </span>
        </Link>
      </div>
      <div className="divide-y divide-border/50">
        {upcoming?.map((r) => {
          const soon = r?.minutesUntil <= 15;
          return (
            <div
              key={r?.id}
              className={`console-row flex items-center gap-3 px-4 py-3 ${soon ? 'bg-warning/5' : ''}`}
            >
              <div
                className={`flex-shrink-0 w-9 h-9 rounded-lg border flex flex-col items-center justify-center ${
                  soon ? 'border-warning/30 bg-warning/10' : 'border-border bg-card'
                }`}
              >
                <CalendarClock
                  size={12}
                  className={soon ? 'text-warning' : 'text-primary'}
                />
                <span className="text-[10px] font-bold font-data-mono text-foreground leading-none mt-0.5">
                  {r?.time}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{r?.customer}</p>
                <p className="text-xs text-muted-foreground">
                  {r?.room} · {r?.game}
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                <span className="text-xs font-bold font-tabular text-muted-foreground flex items-center gap-1 justify-end">
                  <Users size={10} /> {r?.players}
                </span>
                <span
                  className={`text-[11px] font-bold ${soon ? 'text-warning' : 'text-accent'}`}
                >
                  in {r?.minutesUntil}m
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
