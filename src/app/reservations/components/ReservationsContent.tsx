'use client';
import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, UserCheck, X, AlertTriangle } from 'lucide-react';
import ReservationsHeader from './ReservationsHeader';
import ReservationFilters from './ReservationFilters';
import ReservationsTable from './ReservationsTable';
import ReservationDrawer from './ReservationDrawer';
import QuickBookModal, { type BookReservationPayload } from './QuickBookModal';
import RateCustomerModal from './RateCustomerModal';
import { toast, Toaster } from 'sonner';
import { reservationsApi, customersApi, useAsyncData, toastApiError } from '@/lib/api';
import { startSession } from '@/lib/api/sessions';
import { useAuth } from '@/contexts/AuthContext';

export type ReservationStatus =
  'Reserved' | 'Arrived' | 'Active' | 'Completed' | 'Cancelled' | 'No Show' | 'Waiting' | 'Late';

export interface Reservation {
  id: string;
  customer: string;
  phone: string;
  room: string;
  roomId?: string | null;
  customerId?: string | null;
  roomType: 'Standard' | 'Premium' | 'VIP';
  game: string;
  players: number;
  date: string;
  time: string;
  duration: string | null;
  status: ReservationStatus;
  sessionType: 'open' | 'fixed';
  notes?: string;
  createdBy: 'staff' | 'customer';
  customerStatus: 'New' | 'Regular' | 'Loyal' | 'VIP' | 'Low Reliability';
  category?: 'playstation' | 'billiards' | 'cafe';
}

const weekdays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function MiniCalendar({ reservations }: { reservations: Reservation[] }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const year = base.getFullYear();
  const month = base.getMonth();
  const monthLabel = base.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const firstDay = (base.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Real booking density: days of this month that hold active reservations.
  const bookedDays = useMemo(() => {
    const days = new Set<number>();
    for (const r of reservations) {
      if (['Cancelled', 'Completed', 'No Show'].includes(r.status)) continue;
      const [y, m, d] = r.date.split('-').map(Number);
      if (y === year && m === month + 1) days.add(d);
    }
    return [...days];
  }, [reservations, year, month]);
  const cells: (number | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="glass-panel rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">{monthLabel}</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMonthOffset((o) => o - 1)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => setMonthOffset((o) => o + 1)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekdays.map((d) => (
          <span
            key={`wd-${d}`}
            className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-center"
          >
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) =>
          d === null ? (
            <span key={`cal-empty-${i}`} />
          ) : (
            <span
              key={`cal-day-${d}`}
              className={`relative h-8 flex items-center justify-center text-xs rounded-full transition-colors ${
                now.getDate() === d && now.getMonth() === month && now.getFullYear() === year
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'text-foreground'
              }`}
            >
              {d}
              {bookedDays.includes(d) && (
                <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-accent" />
              )}
            </span>
          )
        )}
      </div>
    </div>
  );
}

function CapacitySnapshot({ reservations }: { reservations: Reservation[] }) {
  const today = todayISO();
  const todays = reservations.filter(
    (r) => r.date === today && !['Cancelled', 'Completed', 'No Show'].includes(r.status)
  );
  const vipTotal = reservations.filter((r) => r.roomType === 'VIP').length > 0 ? todays.filter((r) => r.roomType === 'VIP').length : 0;
  const standardTotal = todays.filter((r) => r.roomType !== 'VIP').length;
  const expectedGuests = todays.reduce((sum, r) => sum + r.players, 0);
  const bars = [
    {
      label: 'VIP Lounges',
      current: vipTotal,
      total: Math.max(vipTotal, 1),
      fill: 'bg-[#e9c400] shadow-[0_0_8px_rgba(233,196,0,0.35)]',
    },
    {
      label: 'Standard & Premium',
      current: standardTotal,
      total: Math.max(standardTotal, 1),
      fill: 'bg-accent shadow-[0_0_8px_rgba(78,222,163,0.35)]',
    },
  ];

  return (
    <div className="glass-panel rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Today&rsquo;s Bookings</h3>
        <span className="text-xs font-data-mono text-muted-foreground">{today}</span>
      </div>
      <div className="space-y-4">
        {bars.map((b) => (
          <div key={`cap-${b.label}`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-muted-foreground">{b.label}</span>
              <span className="text-xs font-data-mono font-semibold text-foreground">
                {b.current}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-[#0a0a12] overflow-hidden">
              <div
                className={`h-full rounded-full ${b.fill}`}
                style={{ width: `${b.total ? Math.round((b.current / b.total) * 100) : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-[#273647] flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Expected Guests</span>
        <span className="text-sm font-bold font-data-mono text-accent">{expectedGuests}</span>
      </div>
    </div>
  );
}

export default function ReservationsContent() {
  const { user, role } = useAuth();
  const isCustomer = role === 'customer';
  const customerName = user?.name ?? '';
  // Bounded fetch: ~2 months of history covers the calendar widget and
  // filters without dragging the whole table over the wire.
  const { data, loading, reload } = useAsyncData(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    d.setDate(1);
    const pad = (n: number) => String(n).padStart(2, '0');
    const fromDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return reservationsApi.list({ fromDate, limit: 500 });
  }, []);
  const reservations = (data ?? []).map((r): Reservation => ({ ...r, customerStatus: 'Regular' }));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | 'all'>('all');
  const [dateFilter, setDateFilter] = useState(todayISO());
  const [rateTarget, setRateTarget] = useState<Reservation | null>(null);
  const [quickBookOpen, setQuickBookOpen] = useState(false);
  const [arrivalConfirmId, setArrivalConfirmId] = useState<string | null>(null);

  const filtered = reservations.filter((r) => {
    const matchesCustomer = !isCustomer || r.customer === customerName;
    const matchesSearch =
      !searchQuery ||
      r.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.phone.includes(searchQuery) ||
      r.room.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.game.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesDate = isCustomer || !dateFilter || r.date === dateFilter;
    return matchesCustomer && matchesSearch && matchesStatus && matchesDate;
  });

  // ── Arrival flow: today's Reserved bookings that are due now ──
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const dueArrivals = useMemo(
    () =>
      isCustomer
        ? []
        : reservations
            .filter(
              (r) =>
                r.status === 'Reserved' &&
                r.date === todayISO() &&
                toMinutes(r.time) <= nowMinutes
            )
            .sort((a, b) => toMinutes(a.time) - toMinutes(b.time)),
    [reservations, isCustomer, nowMinutes]
  );

  const handleAddReservation = async (res: BookReservationPayload) => {
    try {
      // Link to the existing customer, or create one — never duplicate.
      let customerId = res.customerId ?? null;
      if (!customerId && /^01[0-9]{9}$/.test(res.phone.trim())) {
        const result = await customersApi.createIfAbsent({
          name: res.customer,
          phone: res.phone,
        });
        customerId = result.id;
        if (result.created) toast.success(`Customer “${res.customer}” created`);
        else toast.success('Linked to existing customer');
      }
      await reservationsApi.create({
        customer_id: customerId,
        guest_name: res.customer,
        phone: res.phone,
        room_id: res.roomId ?? null,
        category: res.category ?? 'playstation',
        game: res.game,
        players: res.players,
        res_date: res.date,
        res_time: res.time,
        duration_minutes: res.duration ? Number(res.duration) : null,
        session_kind: res.sessionType,
        notes: res.notes ?? null,
        created_by_role: res.createdBy,
      });
      setDateFilter(res.date);
      setDrawerOpen(false);
      setQuickBookOpen(false);
      toast.success('Reservation saved');
      reload();
    } catch (err) {
      toastApiError(err);
    }
  };

  const handleStatusChange = async (id: string, status: ReservationStatus) => {
    try {
      await reservationsApi.update(id, { status });
      toast.success(`Reservation marked as ${status}`);
      reload();
    } catch (err) {
      toastApiError(err);
    }
  };

  const handleArrivalStart = async (res: Reservation) => {
    if (!res.roomId) {
      toast.error('This reservation has no room bound — start the session manually');
      return;
    }
    try {
      await startSession({
        p_room_id: res.roomId,
        p_guest_name: res.customer,
        p_phone: res.phone === '—' ? '' : res.phone,
        p_game: res.game === '—' ? '' : res.game,
        p_players: res.players,
        p_session_kind: res.sessionType,
        p_fixed_duration_minutes: res.duration ? Number(res.duration) : null,
        p_customer_id: res.customerId ?? null,
        p_reservation_id: res.id,
      });
      await reservationsApi.update(res.id, { status: 'Active' });
      toast.success(`Session started in ${res.room} for ${res.customer}`);
      reload();
    } catch (err) {
      toastApiError(err);
    }
  };

  return (
    <div className="p-4 lg:p-6 xl:p-8 max-w-screen-2xl mx-auto">
      <Toaster position="bottom-right" theme="system" />
      <ReservationsHeader
        onNewReservation={() => setDrawerOpen(true)}
        onQuickBook={() => setQuickBookOpen(true)}
        count={filtered.length}
        isCustomer={isCustomer}
      />
      {loading ? (
        <div className="glass-panel p-10 text-center text-muted-foreground">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-3 space-y-6">
            {/* Arrival notifications — due Reserved bookings for today */}
            {dueArrivals.length > 0 && (
              <div className="glass-panel rounded-xl border-warning/40 overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border bg-warning/10">
                  <Clock size={16} className="text-warning" />
                  <h2 className="text-sm font-bold text-foreground">
                    Arrivals due ({dueArrivals.length})
                  </h2>
                </div>
                <div className="divide-y divide-border/60">
                  {dueArrivals.map((res) => {
                    const late = nowMinutes - toMinutes(res.time) > 30;
                    return (
                      <div
                        key={`arr-${res.id}`}
                        className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-foreground">
                              {res.customer}
                            </span>
                            {late && (
                              <span className="status-badge bg-danger/10 text-danger">
                                <AlertTriangle size={11} /> LATE {nowMinutes - toMinutes(res.time)}m
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground font-data-mono">
                              {res.time}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {res.room} · {res.players}{' '}
                            {res.players === 1 ? 'player' : 'players'} ·{' '}
                            {res.game !== '—' ? res.game : res.sessionType}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {arrivalConfirmId === res.id ? (
                            <>
                              <span className="text-xs text-muted-foreground">Cancel booking?</span>
                              <button
                                onClick={() => {
                                  setArrivalConfirmId(null);
                                  void handleStatusChange(res.id, 'Cancelled');
                                }}
                                className="btn-danger !py-1.5 !px-3 text-xs"
                              >
                                Yes, Cancel
                              </button>
                              <button
                                onClick={() => setArrivalConfirmId(null)}
                                className="btn-secondary !py-1.5 !px-3 text-xs"
                              >
                                Keep
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => void handleArrivalStart(res)}
                                className="btn-primary !py-1.5 !px-3 text-xs flex items-center gap-1.5"
                              >
                                <UserCheck size={13} /> Arrived → Start
                              </button>
                              <button
                                onClick={() => void handleStatusChange(res.id, 'Late')}
                                className="btn-secondary !py-1.5 !px-3 text-xs"
                              >
                                Mark Late
                              </button>
                              <button
                                onClick={() => setArrivalConfirmId(res.id)}
                                className="btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1"
                              >
                                <X size={12} /> Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <ReservationFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              dateFilter={dateFilter}
              onDateChange={setDateFilter}
              reservations={reservations}
              isCustomer={isCustomer}
            />
            <ReservationsTable
              reservations={filtered}
              onStatusChange={handleStatusChange}
              onRateCustomer={isCustomer ? undefined : setRateTarget}
              isCustomer={isCustomer}
            />
          </div>
          <div className="xl:col-span-1 space-y-6">
            <MiniCalendar reservations={reservations} />
            <CapacitySnapshot reservations={reservations} />
          </div>
        </div>
      )}
      {drawerOpen && (
        <ReservationDrawer onClose={() => setDrawerOpen(false)} onSave={handleAddReservation} />
      )}
      {quickBookOpen && (
        <QuickBookModal
          defaultCustomer={isCustomer ? customerName : ''}
          createdBy={isCustomer ? 'customer' : 'staff'}
          onClose={() => setQuickBookOpen(false)}
          onSave={handleAddReservation}
        />
      )}
      {rateTarget && (
        <RateCustomerModal
          customer={rateTarget.customer}
          room={rateTarget.room}
          game={rateTarget.game}
          onClose={() => setRateTarget(null)}
        />
      )}
    </div>
  );
}
