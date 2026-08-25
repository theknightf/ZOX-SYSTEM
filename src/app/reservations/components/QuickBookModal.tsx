'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { X, Zap, Gamepad2, Users, CalendarClock, Check, Phone } from 'lucide-react';
import type { Reservation } from './ReservationsContent';
import { toast } from 'sonner';
import { roomsApi, customersApi, reservationsApi, useAsyncData } from '@/lib/api';
import type { UiRoom } from '@/lib/api';

type Category = 'playstation' | 'billiards' | 'cafe';

/** Reservation payload extended with the resolved backend identifiers. */
export type BookReservationPayload = Reservation & {
  customerId?: string | null;
  roomId?: string | null;
};

const games = ['FC 26', 'GTA V', 'Call of Duty', 'PES 2024', 'Mortal Kombat 1', 'WWE 2K25'];

const categoryMeta: Record<Category, { label: string; emoji: string }> = {
  playstation: { label: 'PlayStation', emoji: '🎮' },
  billiards: { label: 'Billiards', emoji: '🎱' },
  cafe: { label: 'Cafe', emoji: '☕' },
};

const PHONE_RE = /^01[0-9]{9}$/;

function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Minutes since midnight from "HH:mm". */
function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

interface QuickBookModalProps {
  defaultCustomer?: string;
  createdBy?: 'staff' | 'customer';
  onClose: () => void;
  onSave: (res: BookReservationPayload) => void;
}

export default function QuickBookModal({
  defaultCustomer = '',
  createdBy = 'staff',
  onClose,
  onSave,
}: QuickBookModalProps) {
  const { data: allRooms } = useAsyncData(() => roomsApi.list(), []);

  const [category, setCategory] = useState<Category>('playstation');
  const [table, setTable] = useState<string | null>(null);
  const [customer, setCustomer] = useState(defaultCustomer);
  const [phone, setPhone] = useState('');
  const [game, setGame] = useState('FC 26');
  const [players, setPlayers] = useState(2);
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState('17:00');
  const [duration, setDuration] = useState('60');

  // Customer phone lookup (existing → link, missing → create on save)
  const [matchedCustomer, setMatchedCustomer] = useState<
    Awaited<ReturnType<typeof customersApi.getByPhone>>
  >(null);
  const [lookupDone, setLookupDone] = useState(true);

  // Reservation overlap for the chosen slot (room_id → true = conflict)
  const [conflicts, setConflicts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const clean = phone.trim();
    if (!PHONE_RE.test(clean)) {
      setMatchedCustomer(null);
      setLookupDone(true);
      return;
    }
    setLookupDone(false);
    const t = setTimeout(async () => {
      try {
        const found = await customersApi.getByPhone(clean);
        setMatchedCustomer(found);
        if (found) setCustomer(found.name);
      } catch {
        /* lookup is best-effort; booking still works with guest name */
      } finally {
        setLookupDone(true);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [phone]);

  // Capacity + availability filtering — rooms that cannot fit the party
  // are excluded entirely, per the operational requirement.
  const eligibleRooms = useMemo(() => {
    return (allRooms ?? []).filter(
      (r) => r.category === category && r.capacity >= players && r.status === 'Available'
    );
  }, [allRooms, category, players]);

  const selectedRoom: UiRoom | undefined = useMemo(
    () => eligibleRooms.find((r) => r.name === table),
    [eligibleRooms, table]
  );

  // Conflict check against existing reservations for the chosen slot.
  useEffect(() => {
    if (eligibleRooms.length === 0) return;
    let cancelled = false;
    const run = async () => {
      const results: Record<string, boolean> = {};
      await Promise.all(
        eligibleRooms.map(async (room) => {
          try {
            const client = (
              await import('@/lib/supabase/client')
            ).getSupabaseBrowserClient();
            const { data, error } = await (
              client.rpc as unknown as (
                fn: string,
                a: Record<string, unknown>
              ) => Promise<{ data: boolean | null; error: { message: string } | null }>
            )('room_slot_conflict', {
              p_room_id: room.id,
              p_date: date,
              p_time: `${time}:00`,
              p_duration_minutes: duration ? Number(duration) : null,
            });
            if (!error && data != null) {
              results[room.id] = data;
              return;
            }
            throw new Error(error?.message ?? 'no rpc');
          } catch {
            // Fallback: client-side overlap check for pre-migration databases.
            try {
              const dayRes = await reservationsApi.list();
              results[room.id] = dayRes.some(
                (r) =>
                  r.roomId === room.id &&
                  r.date === date &&
                  ['Reserved', 'Arrived', 'Active', 'Waiting', 'Late'].includes(r.status) &&
                  (duration === '' ||
                    r.duration == null ||
                    toMinutes(r.time) < toMinutes(time) + Number(duration)) &&
                  (r.duration == null ||
                    toMinutes(time) < toMinutes(r.time) + Number(r.duration))
              );
            } catch {
              results[room.id] = false;
            }
          }
        })
      );
      if (!cancelled) setConflicts(results);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [eligibleRooms, date, time, duration]);

  const conflictFree = eligibleRooms.filter((r) => !conflicts[r.id]);

  const switchCategory = (c: Category) => {
    setCategory(c);
    setTable(null);
  };

  const handleBook = () => {
    if (!selectedRoom) {
      toast.error('Pick a room first');
      return;
    }
    if (!customer.trim()) {
      toast.error('Enter the customer name');
      return;
    }
    if (players > selectedRoom.capacity) {
      toast.error(`${selectedRoom.name} seats max ${selectedRoom.capacity} players`);
      return;
    }
    if (conflicts[selectedRoom.id]) {
      toast.error('That slot conflicts with an existing reservation — pick another room or time');
      return;
    }
    const newRes: BookReservationPayload = {
      id: `res-${Date.now()}`,
      customer: customer.trim(),
      phone: phone.trim() || '—',
      room: selectedRoom.name,
      roomId: selectedRoom.id,
      roomType: selectedRoom.roomType,
      game: category === 'playstation' ? game : '—',
      players,
      date,
      time,
      duration: duration || null,
      status: 'Reserved',
      sessionType: duration ? 'fixed' : 'open',
      createdBy,
      customerStatus: matchedCustomer ? 'Regular' : 'New',
      category,
      customerId: matchedCustomer?.id ?? null,
    };
    onSave(newRes);
    toast.success(`${selectedRoom.name} booked for ${customer.trim()}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="fixed inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl slide-up max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-warning/15 border border-warning/25 text-warning flex items-center justify-center">
              <Zap size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Quick Book</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pick a room and book in seconds
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto scrollbar-thin flex-1">
          {/* Customer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Customer <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                className="input-field"
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                <Phone size={13} className="inline mr-1" />
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input-field"
                placeholder="01xxxxxxxxx"
              />
            </div>
          </div>

          {/* Customer lookup result */}
          {PHONE_RE.test(phone.trim()) && !lookupDone && (
            <p className="text-xs text-muted-foreground">Searching existing customers…</p>
          )}
          {matchedCustomer && (
            <div className="flex items-center gap-3 p-3 rounded-xl border border-accent/30 bg-accent/10">
              <Check size={16} className="text-accent shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  Existing customer: {matchedCustomer.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {matchedCustomer.tier} · {matchedCustomer.visits} visits ·{' '}
                  {matchedCustomer.loyaltyPoints.toLocaleString()} pts — reservation will be
                  linked to this record
                </p>
              </div>
            </div>
          )}
          {!matchedCustomer && lookupDone && PHONE_RE.test(phone.trim()) && (
            <div className="p-3 rounded-xl border border-primary/25 bg-primary/10">
              <p className="text-xs text-primary font-semibold">
                New customer — a customer record will be created with this phone number
              </p>
            </div>
          )}
          {phone.trim() !== '' && !PHONE_RE.test(phone.trim()) && (
            <p className="text-xs text-warning">
              Tip: Egyptian format 01xxxxxxxxx enables existing-customer matching
            </p>
          )}

          {/* Category */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Location type
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(categoryMeta) as Category[]).map((c) => (
                <button
                  key={`cat-${c}`}
                  onClick={() => switchCategory(c)}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-150 active:scale-95 ${
                    category === c
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-muted/30 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span>{categoryMeta[c].emoji}</span>
                  {categoryMeta[c].label}
                </button>
              ))}
            </div>
          </div>

          {/* Rooms — real rooms, capacity-filtered, conflict-aware */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Available for {players} {players === 1 ? 'player' : 'players'} · {date} {time}
            </p>
            {allRooms == null ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Loading rooms…</p>
            ) : eligibleRooms.length === 0 ? (
              <p className="text-xs text-warning py-4 text-center">
                No {categoryMeta[category].label} rooms fit {players} players. Lower the party
                size or add rooms in Room Management.
              </p>
            ) : conflictFree.length === 0 ? (
              <p className="text-xs text-warning py-4 text-center">
                Every fitting room is already booked at this slot — try another time.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {conflictFree.map((room) => {
                  const isSelected = table === room.name;
                  return (
                    <button
                      key={room.id}
                      onClick={() => setTable(room.name)}
                      className={`relative p-3 rounded-xl border text-left transition-all duration-150 active:scale-95 ${
                        isSelected
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-muted/20 hover:border-border/60'
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          <Check size={10} />
                        </span>
                      )}
                      <p className="text-sm font-semibold text-foreground truncate">{room.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {room.roomType} · max {room.capacity} · {room.hourlyRate} EGP/h
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Game (playstation only) + players */}
          <div className="grid grid-cols-2 gap-3">
            {category === 'playstation' && (
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  <Gamepad2 size={13} className="inline mr-1" />
                  Game
                </label>
                <select
                  value={game}
                  onChange={(e) => setGame(e.target.value)}
                  className="input-field"
                >
                  {games.map((g) => (
                    <option key={`qb-game-${g}`} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                <Users size={13} className="inline mr-1" />
                Players
              </label>
              <select
                value={players}
                onChange={(e) => setPlayers(Number(e.target.value))}
                className="input-field"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                  <option key={`qb-p-${n}`} value={n}>
                    {n} {n === 1 ? 'player' : 'players'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                <CalendarClock size={13} className="inline mr-1" />
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Duration</label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="input-field"
              >
                <option value="">Open</option>
                <option value="30">30 min</option>
                <option value="60">1 hour</option>
                <option value="90">1.5 hours</option>
                <option value="120">2 hours</option>
              </select>
            </div>
          </div>

          {selectedRoom && (
            <div className="flex items-center justify-between p-3 bg-accent/10 border border-accent/20 rounded-xl">
              <span className="text-sm font-semibold text-accent">
                {categoryMeta[category].emoji} {selectedRoom.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {date} · {time} · {duration ? `${duration} min` : 'Open-ended'}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex-shrink-0">
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              onClick={handleBook}
              disabled={!selectedRoom || !customer.trim()}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              <Zap size={14} />
              Book Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
