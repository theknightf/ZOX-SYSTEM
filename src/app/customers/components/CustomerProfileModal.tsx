'use client';
import React, { useEffect, useState } from 'react';
import { X, Loader2, Star, Phone, Mail, Gamepad2, Receipt } from 'lucide-react';
import type { UiCustomer } from '@/lib/api';
import { fetchAll } from '@/lib/api';
import type {
  ReservationRow,
  LiveSessionRow,
  SaleRow,
  FeedbackRow,
} from '@/lib/supabase/types';
import Portal from '@/components/ui/Portal';

interface CustomerProfileModalProps {
  customer: UiCustomer;
  onClose: () => void;
}

interface HistoryData {
  reservations: ReservationRow[];
  sessions: LiveSessionRow[];
  sales: SaleRow[];
  feedback: FeedbackRow[];
}

const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function CustomerProfileModal({ customer, onClose }: CustomerProfileModalProps) {
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load every history stream in parallel — one phone-aware reservations
  // query (or-filter) instead of two sequential round-trips.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const phone = customer.phone && customer.phone !== '—' ? customer.phone : null;
        const orExpr = [
          `customer_id.eq.${customer.id}`,
          ...(phone ? [`phone.eq.${phone}`] : []),
        ].join(',');
        const [reservations, sessions, sales, feedback] = await Promise.all([
          fetchAll<ReservationRow>('reservations', {
            select: '*, rooms(name)',
            or: orExpr,
            order: 'res_date',
            ascending: false,
            limit: 50,
          }),
          fetchAll<LiveSessionRow>('live_sessions', {
            eq: { customer_id: customer.id },
            order: 'started_at',
            ascending: false,
            limit: 50,
          }),
          fetchAll<SaleRow>('sales', {
            eq: { customer_id: customer.id },
            order: 'sold_at',
            ascending: false,
            limit: 50,
          }),
          fetchAll<FeedbackRow>('feedback', {
            eq: { customer_id: customer.id },
            order: 'submitted_at',
            ascending: false,
            limit: 20,
          }),
        ]);
        if (!cancelled) setHistory({ reservations, sessions, sales, feedback });
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Could not load customer history');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customer.id, customer.phone]);

  const completed = (history?.sessions ?? []).filter((s) => s.status === 'completed');
  const sessionsSpend = completed.reduce((sum, s) => sum + Number(s.total_cost ?? 0), 0);
  const salesSpend = (history?.sales ?? []).reduce((sum, s) => sum + Number(s.total), 0);
  const lastSessionAt =
    completed[0]?.ended_at ?? completed[0]?.started_at ?? history?.sessions[0]?.started_at;
  const gamesPlayed = [...new Set(history?.sessions.map((s) => s.game).filter(Boolean))];
  const avgRating =
    history && history.feedback.length > 0
      ? (
          history.feedback.reduce((sum, f) => sum + f.rating, 0) / history.feedback.length
        ).toFixed(1)
      : null;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Profile of ${customer.name}`}
          className="glass-panel pop-in w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-border shrink-0">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-[#6d28d9] flex items-center justify-center text-white text-sm font-bold shrink-0">
                {customer.name
                  .split(' ')
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-extrabold tracking-tight text-foreground truncate">
                    {customer.name}
                  </h2>
                  <span className="status-badge bg-primary/15 text-primary">
                    {customer.tier}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1 flex-wrap text-xs text-muted-foreground">
                  {customer.phone && customer.phone !== '—' && (
                    <span className="flex items-center gap-1">
                      <Phone size={11} /> {customer.phone}
                    </span>
                  )}
                  {customer.email && customer.email !== '—' && (
                    <span className="flex items-center gap-1 truncate">
                      <Mail size={11} /> {customer.email}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 shrink-0 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close profile"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto scrollbar-thin space-y-6">
            {error && <p className="text-sm text-danger">{error}</p>}
            {!history && !error && (
              <div className="py-12 flex items-center justify-center text-muted-foreground">
                <Loader2 size={20} className="animate-spin mr-2" /> Loading history…
              </div>
            )}

            {history && (
              <>
                {/* KPI row — real aggregates */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Total Spent', value: `${(sessionsSpend + salesSpend).toLocaleString()} EGP` },
                    { label: 'Sessions', value: String(completed.length) },
                    { label: 'Loyalty Points', value: customer.loyaltyPoints.toLocaleString() },
                    {
                      label: 'Last Activity',
                      value: lastSessionAt ? fmtDate(lastSessionAt) : customer.lastVisit,
                    },
                  ].map((k) => (
                    <div key={k.label} className="bg-card/70 border border-border rounded-xl p-3.5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {k.label}
                      </p>
                      <p className="text-lg font-extrabold font-tabular text-foreground mt-1">
                        {k.value}
                      </p>
                    </div>
                  ))}
                </div>

                {gamesPlayed.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      Games played:
                    </span>
                    {gamesPlayed.slice(0, 8).map((g) => (
                      <span
                        key={g}
                        className="inline-flex items-center gap-1 text-xs font-semibold bg-muted border border-border rounded-full px-2.5 py-0.5 text-foreground"
                      >
                        <Gamepad2 size={10} /> {g}
                      </span>
                    ))}
                  </div>
                )}

                {/* Session history */}
                <section>
                  <h3 className="section-label mb-2.5">Session History</h3>
                  {completed.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No completed sessions yet.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {completed.slice(0, 6).map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between gap-3 bg-card/60 border border-border rounded-lg px-3.5 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {s.game || 'Gaming session'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {fmtDate(s.started_at)} · {s.billed_minutes ?? '—'} min
                            </p>
                          </div>
                          <span className="text-sm font-bold font-data-mono text-accent shrink-0">
                            {Number(s.total_cost ?? 0).toLocaleString()} EGP
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Purchases */}
                <section>
                  <h3 className="section-label mb-2.5">Purchases & Payments</h3>
                  {history.sales.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No direct purchases.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {history.sales.slice(0, 5).map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between gap-3 bg-card/60 border border-border rounded-lg px-3.5 py-2.5"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Receipt size={14} className="text-primary shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">
                                {s.invoice_number}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {fmtDate(s.sold_at)} · {s.payment_method}
                              </p>
                            </div>
                          </div>
                          <span className="text-sm font-bold font-data-mono text-foreground shrink-0">
                            {Number(s.total).toLocaleString()} EGP
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Reservations */}
                <section>
                  <h3 className="section-label mb-2.5">Reservation History</h3>
                  {history.reservations.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No reservations.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {history.reservations.slice(0, 5).map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between gap-3 bg-card/60 border border-border rounded-lg px-3.5 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {(r as unknown as { rooms?: { name?: string } }).rooms?.name ?? 'Room'}{' '}
                              · {r.game}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {r.res_date} at {r.res_time?.slice(0, 5)} · {r.players}p
                            </p>
                          </div>
                          <span className="text-xs font-bold text-muted-foreground shrink-0">
                            {r.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Feedback / complaints */}
                <section>
                  <h3 className="section-label mb-2.5">Feedback & Complaints</h3>
                  {history.feedback.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No feedback submitted.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {history.feedback.slice(0, 4).map((f) => (
                        <div
                          key={f.id}
                          className="bg-card/60 border border-border rounded-lg px-3.5 py-2.5"
                        >
                          <div className="flex items-center gap-1.5">
                            {Array.from({ length: 5 }, (_, i) => (
                              <Star
                                key={i}
                                size={11}
                                className={i < f.rating ? 'text-warning fill-warning' : 'text-muted-foreground'}
                              />
                            ))}
                            <span className="text-xs text-muted-foreground ml-1">
                              {fmtDate(f.submitted_at)} · {f.status}
                            </span>
                          </div>
                          {f.notes && <p className="text-xs text-foreground mt-1">{f.notes}</p>}
                        </div>
                      ))}
                      {avgRating && (
                        <p className="text-xs text-muted-foreground pt-1">
                          Average rating: {avgRating} / 5
                        </p>
                      )}
                    </div>
                  )}
                </section>

                {customer.notes && (
                  <section>
                    <h3 className="section-label mb-2.5">Notes</h3>
                    <p className="text-sm text-foreground bg-card/60 border border-border rounded-lg px-3.5 py-2.5">
                      {customer.notes}
                    </p>
                  </section>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}
