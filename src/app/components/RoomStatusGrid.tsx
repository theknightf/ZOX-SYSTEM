'use client';
import React, { useState } from 'react';
import { Gamepad2, Users, Clock, Zap, Star } from 'lucide-react';
import Link from 'next/link';
import RoomQuickActions from '@/components/rooms/RoomQuickActions';

type RoomStatus = 'available' | 'occupied' | 'reserved' | 'maintenance';
type RoomType = 'Standard' | 'Premium' | 'VIP';

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  capacity: number;
  status: RoomStatus;
  currentCustomer?: string;
  game?: string;
  sessionStart?: string;
  elapsedMinutes?: number;
  controllers: number;
  quality: number;
  psModel: string;
  note?: string;
}

interface RoomStatusGridProps {
  rooms?: Room[] | null;
  onRoomStatusChange?: (roomId: string, status: Room['status'], note?: string) => void;
}

const statusConfig: Record<
  RoomStatus,
  { label: string; bg: string; text: string; dot: string; cardClass: string }
> = {
  available: {
    label: 'Available',
    bg: 'bg-success/10',
    text: 'text-success',
    dot: 'bg-success',
    cardClass: 'room-available-bg',
  },
  occupied: {
    label: 'Occupied',
    bg: 'bg-danger/10',
    text: 'text-danger',
    dot: 'bg-danger',
    cardClass: 'room-occupied-bg',
  },
  reserved: {
    label: 'Reserved',
    bg: 'bg-warning/10',
    text: 'text-warning',
    dot: 'bg-warning',
    cardClass: 'room-reserved-bg',
  },
  maintenance: {
    label: 'Maintenance',
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    dot: 'bg-muted-foreground',
    cardClass: 'room-maintenance-bg',
  },
};

const typeConfig: Record<RoomType, { color: string; bg: string; cardClass?: string }> = {
  Standard: { color: 'text-muted-foreground', bg: 'bg-muted', cardClass: 'room-standard-bg' },
  Premium: { color: 'text-info', bg: 'bg-info/10', cardClass: 'room-premium-bg' },
  VIP: { color: 'text-vip', bg: 'bg-vip/10', cardClass: 'room-vip-bg' },
};

function formatElapsed(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function QualityStars({ quality }: { quality: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={`star-${i}`}
          size={10}
          className={i <= quality ? 'text-warning fill-warning' : 'text-muted-foreground'}
        />
      ))}
    </div>
  );
}

export default function RoomStatusGrid({ rooms = [], onRoomStatusChange }: RoomStatusGridProps) {
  const [filter, setFilter] = useState<RoomStatus | 'all'>('all');
  const [qaRooms, setQaRooms] = useState<Record<string, { status: Room['status']; note?: string }>>(
    {}
  );
  // Local overlay so Quick Actions status changes reflect instantly; the host
  // (dashboard) can persist via onRoomStatusChange when it owns real state.
  const applyLocal = (room: Room, next: Room['status'], note?: string) => {
    setQaRooms((prev) => ({ ...prev, [room.id]: { status: next, note: note ?? room.note } }));
    onRoomStatusChange?.(room.id, next, note);
  };
  const safeRooms = Array.isArray(rooms) ? rooms : [];
  const validRooms = safeRooms
    .filter((r): r is Room => r != null && typeof r === 'object' && 'status' in r)
    .map((r) => (qaRooms[r.id] ? { ...r, ...qaRooms[r.id], id: r.id } : r));

  const filtered = filter === 'all' ? validRooms : validRooms.filter((r) => r.status === filter);
  const counts = {
    all: validRooms.length,
    available: validRooms.filter((r) => r.status === 'available').length,
    occupied: validRooms.filter((r) => r.status === 'occupied').length,
    reserved: validRooms.filter((r) => r.status === 'reserved').length,
    maintenance: validRooms.filter((r) => r.status === 'maintenance').length,
  };

  return (
    <div className="glass-panel rounded-xl p-4">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-foreground">Room Status</h2>
          <p className="text-xs text-muted-foreground">All gaming rooms - live view</p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['all', 'available', 'occupied', 'reserved', 'maintenance'] as const).map((f) => (
            <button
              key={`filter-${f}`}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150 ${
                filter === f
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                  : 'bg-muted text-muted-foreground hover:text-foreground hover:border-primary/30 border border-transparent'
              }`}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((room) => {
          const sc = statusConfig[room.status];
          const tc = typeConfig[room.type];
          return (
            <div
              key={room.id}
              className={`glass-panel rounded-xl p-4 transition-all duration-200 cursor-pointer hover:border-primary/40 ${sc.cardClass} ${tc.cardClass ?? ''}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-bold text-foreground">{room.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {room.psModel} · {room.type}
                  </p>
                </div>
                <div
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${sc.dot} ${room.status === 'occupied' ? 'animate-pulse' : ''}`}
                  />
                  {sc.label}
                </div>
              </div>

              <div className="space-y-1.5 mb-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users size={11} />
                  <span>Max {room.capacity} players</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Gamepad2 size={11} />
                  <span>{room.controllers} controllers</span>
                </div>
                <QualityStars quality={room.quality} />
              </div>

              {room.status === 'occupied' && room.currentCustomer && (
                <div className="bg-background/60 rounded-lg p-2 space-y-1 border border-border/50">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {room.currentCustomer}
                  </p>
                  {room.game && <p className="text-xs text-muted-foreground">{room.game}</p>}
                  <div className="flex items-center gap-1 text-xs text-accent">
                    <Clock size={10} className="session-timer-pulse" />
                    <span className="font-data-mono font-semibold">
                      {formatElapsed(room.elapsedMinutes || 0)}
                    </span>
                    <span className="text-muted-foreground">since {room.sessionStart}</span>
                  </div>
                </div>
              )}

              {room.status === 'reserved' && room.currentCustomer && (
                <div className="bg-background/60 rounded-lg p-2 border border-warning/20">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {room.currentCustomer}
                  </p>
                  <p className="text-xs text-warning">Arriving at {room.sessionStart}</p>
                </div>
              )}

              {room.status === 'maintenance' && room.note && (
                <div className="bg-danger/5 rounded-lg p-2 border border-danger/10">
                  <p className="text-xs text-danger">{room.note}</p>
                </div>
              )}

              {room.status === 'available' && (
                <Link
                  href="/reservations"
                  className="w-full mt-1 py-1.5 bg-accent/10 border border-accent/20 text-accent text-xs font-semibold rounded-lg hover:bg-accent/20 hover:shadow-lg hover:shadow-accent/10 transition-all flex items-center justify-center"
                >
                  <Zap size={11} className="mr-1" />
                  Quick Assign
                </Link>
              )}

              {/* Quick Actions — available for every room status */}
              <div className="mt-2">
                <RoomQuickActions
                  room={room}
                  onStatusChange={(next, note) => applyLocal(room, next, note)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
