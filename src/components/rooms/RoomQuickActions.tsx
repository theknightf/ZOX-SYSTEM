'use client';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Play,
  CalendarPlus,
  SprayCan,
  Wrench,
  Square,
  CupSoda,
  Clock,
  Pause,
  ArrowLeftRight,
  Printer,
  StickyNote,
  CalendarCog,
  Ban,
  CheckCircle2,
  X,
  Loader2,
  Settings2,
} from 'lucide-react';
import { toast } from 'sonner';
import Portal from '@/components/ui/Portal';
import {
  fetchLiveSessions,
  pauseSession,
  resumeSession,
  startSession,
  endSession,
  extendSession,
  addSessionProduct,
  type UiLiveSession,
  type CompletedSale,
} from '@/lib/api/sessions';
import { reservationsApi } from '@/lib/api/floorOps';
import { toastApiError } from '@/lib/api';
import { computeBill } from '@/lib/billing';
import PaymentModal from '@/app/live-sessions/components/PaymentModal';
import EvaluationPopup from '@/app/live-sessions/components/EvaluationPopup';
import AddProductModal from '@/app/live-sessions/components/AddProductModal';
import QuickBookModal from '@/app/reservations/components/QuickBookModal';

export type RoomStatus = 'available' | 'occupied' | 'reserved' | 'maintenance';

export interface RoomLike {
  id: string;
  name: string;
  type: 'Standard' | 'Premium' | 'VIP';
  status: RoomStatus;
  note?: string;
}

type ActionTone = 'primary' | 'accent' | 'warning' | 'danger' | 'neutral';

interface RoomActionDef {
  id: string;
  label: string;
  icon: React.ReactNode;
  tone: ActionTone;
}

/** Centralized action definitions per room status — single source of truth. */
const ROOM_ACTIONS: Record<RoomStatus, RoomActionDef[]> = {
  available: [
    { id: 'start-session', label: 'Start Session', icon: <Play size={22} />, tone: 'accent' },
    { id: 'reserve-room', label: 'Reserve Room', icon: <CalendarPlus size={22} />, tone: 'primary' },
    { id: 'mark-cleaning', label: 'Mark as Cleaning', icon: <SprayCan size={22} />, tone: 'warning' },
    { id: 'mark-maintenance', label: 'Put Under Maintenance', icon: <Wrench size={22} />, tone: 'neutral' },
  ],
  occupied: [
    { id: 'end-session', label: 'Checkout', icon: <Square size={22} />, tone: 'danger' },
    { id: 'add-drinks', label: 'Add Drink', icon: <CupSoda size={22} />, tone: 'primary' },
    { id: 'extend-15', label: '+15 min Time', icon: <Clock size={22} />, tone: 'accent' },
    { id: 'pause-session', label: 'Pause Session', icon: <Pause size={22} />, tone: 'warning' },
    { id: 'transfer-room', label: 'Transfer Room', icon: <ArrowLeftRight size={22} />, tone: 'neutral' },
    { id: 'print-receipt', label: 'Print Receipt', icon: <Printer size={22} />, tone: 'neutral' },
    { id: 'edit-notes', label: 'Add/Edit Notes', icon: <StickyNote size={22} />, tone: 'neutral' },
  ],
  reserved: [
    { id: 'start-session', label: 'Start Session', icon: <Play size={22} />, tone: 'accent' },
    { id: 'edit-reservation', label: 'Edit Reservation', icon: <CalendarCog size={22} />, tone: 'primary' },
    { id: 'cancel-reservation', label: 'Cancel Reservation', icon: <Ban size={22} />, tone: 'danger' },
    { id: 'mark-cleaning', label: 'Mark as Cleaning', icon: <SprayCan size={22} />, tone: 'warning' },
    { id: 'mark-maintenance', label: 'Put Under Maintenance', icon: <Wrench size={22} />, tone: 'neutral' },
  ],
  maintenance: [
    { id: 'mark-available', label: 'Mark as Available', icon: <CheckCircle2 size={22} />, tone: 'accent' },
    { id: 'mark-cleaning', label: 'Mark as Cleaning', icon: <SprayCan size={22} />, tone: 'warning' },
    { id: 'add-maintenance-note', label: 'Add Maintenance Note', icon: <StickyNote size={22} />, tone: 'neutral' },
  ],
};

const statusBadge: Record<RoomStatus, string> = {
  available: 'bg-success/10 text-success',
  occupied: 'bg-danger/10 text-danger',
  reserved: 'bg-warning/10 text-warning',
  maintenance: 'bg-muted text-muted-foreground',
};

const toneClasses: Record<ActionTone, string> = {
  primary: 'qa-tile qa-tone-primary',
  accent: 'qa-tile qa-tone-accent',
  warning: 'qa-tile qa-tone-warning',
  danger: 'qa-tile qa-tone-danger',
  neutral: 'qa-tile qa-tone-neutral border',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveSession(roomName: string): Promise<UiLiveSession | null> {
  const sessions = await fetchLiveSessions();
  return (
    sessions.find((s) => s.room === roomName && (s.status === 'active' || s.status === 'paused')) ??
    null
  );
}

function downloadReceiptPdf(session: UiLiveSession): void {
  // jspdf is an existing project dependency; billing mirrors the server RPC.
  void import('jspdf').then(({ default: JsPDF }) => {
    const bill = computeBill(session);
    const doc = new JsPDF();
    let y = 20;
    const line = (text: string, bold = false) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.text(text, 20, y);
      y += 7;
    };
    line('ZOX — Gaming Center', true);
    line(`Receipt · ${new Date().toLocaleString()}`);
    y += 4;
    line(`Room: ${session.room}`, true);
    line(`Customer: ${session.customer}`);
    if (session.phone) line(`Phone: ${session.phone}`);
    y += 4;
    line(`Time (${bill.billedMinutes} min @ ${session.hourlyRate}/h): ${bill.sessionCost} EGP`);
    session.products.forEach((p) => line(`${p.name} x${p.qty}: ${p.price * p.qty} EGP`));
    y += 4;
    line(`TOTAL: ${bill.subtotal} EGP`, true);
    doc.save(`receipt-${session.room.replace(/\s+/g, '-')}.pdf`);
  });
}

interface RoomQuickActionsProps {
  room: RoomLike;
  onStatusChange?: (next: RoomStatus, note?: string) => void;
  className?: string;
  /** 'button' = single trigger; 'inline' = direct state-aware actions on the card. */
  variant?: 'button' | 'inline';
}

/** Direct one-tap actions shown on the card face per room status (§3). */
const INLINE_ACTIONS: Partial<Record<RoomStatus, string[]>> = {
  available: ['start-session', 'reserve-room'],
  occupied: ['end-session', 'add-drinks', 'extend-15', 'pause-session'],
  reserved: ['start-session', 'cancel-reservation'],
  maintenance: ['mark-available'],
};

export default function RoomQuickActions({
  room,
  onStatusChange,
  className = '',
  variant = 'button',
}: RoomQuickActionsProps) {
  const [open, setOpen] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [liveSession, setLiveSession] = useState<UiLiveSession | null>(null);

  // Reused session flows
  const [paymentTarget, setPaymentTarget] = useState<UiLiveSession | null>(null);
  const [evaluationTarget, setEvaluationTarget] = useState<UiLiveSession | null>(null);
  const [addDrinksTarget, setAddDrinksTarget] = useState<UiLiveSession | null>(null);
  const [bookOpen, setBookOpen] = useState(false);

  // Inline dialogs
  const [dialog, setDialog] = useState<
    | { kind: 'notes'; value: string }
    | { kind: 'confirm-cancel'; reservationId: string }
    | { kind: 'edit-res'; reservationId: string; time: string; date: string; players: number }
    | { kind: 'start-session'; guest: string; players: number }
    | null
  >(null);

  const actions = useMemo(() => ROOM_ACTIONS[room.status], [room.status]);

  // Escape closes the topmost layer (sub-dialog first, then the actions modal).
  useEffect(() => {
    if (!open && !dialog) return;
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      if (dialog) setDialog(null);
      else setOpen(false);
    };
    window.addEventListener('keydown', handleEscapeKey);
    return () => window.removeEventListener('keydown', handleEscapeKey);
  }, [open, dialog]);

  const closeAll = () => {
    setOpen(false);
    setDialog(null);
  };

  const requireLiveSession = async (): Promise<UiLiveSession | null> => {
    try {
      const s = await resolveSession(room.name);
      if (!s) toast.error(`No active session found for ${room.name}`);
      setLiveSession(s);
      return s;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not reach live floor');
      return null;
    }
  };

  const handleConfirmPayment = async (
    sessionId: string,
    method: 'cash' | 'instapay' | 'vodafone'
  ): Promise<CompletedSale> => {
    const paymentMethod =
      method === 'cash' ? 'Cash' : method === 'instapay' ? 'Transfer' : 'Wallet';
    const sale = await endSession({ p_session_id: sessionId, p_payment_method: paymentMethod });
    toast.success(`Invoice ${sale.invoiceNumber} — ${sale.total.toLocaleString()} EGP received`);
    return sale;
  };

  const runAction = async (actionId: string) => {
    switch (actionId) {
      case 'start-session': {
        if (!UUID_RE.test(room.id)) {
          toast.error(`${room.name} has no backend room ID — start sessions from Live Sessions`);
          return;
        }
        setDialog({ kind: 'start-session', guest: '', players: 2 });
        return;
      }
      case 'reserve-room': {
        setBookOpen(true);
        return;
      }
      case 'mark-cleaning':
      case 'mark-maintenance': {
        const note = actionId === 'mark-cleaning' ? 'Cleaning in progress' : room.note ?? '';
        onStatusChange?.('maintenance', note);
        toast.success(
          actionId === 'mark-cleaning'
            ? `${room.name} marked for cleaning`
            : `${room.name} put under maintenance`
        );
        closeAll();
        return;
      }
      case 'mark-available': {
        onStatusChange?.('available');
        toast.success(`${room.name} is available again`);
        closeAll();
        return;
      }
      case 'end-session': {
        setProcessingAction(actionId);
        const s = await requireLiveSession();
        setProcessingAction(null);
        if (!s) return;
        setPaymentTarget(s);
        setOpen(false);
        return;
      }
      case 'add-drinks': {
        setProcessingAction(actionId);
        const s = await requireLiveSession();
        setProcessingAction(null);
        if (!s) return;
        setAddDrinksTarget(s);
        setOpen(false);
        return;
      }
      case 'pause-session': {
        setProcessingAction(actionId);
        const s = await requireLiveSession();
        setProcessingAction(null);
        if (!s) return;
        try {
          if (s.status === 'active') await pauseSession(s.id);
          else await resumeSession(s.id);
          toast.success(`${s.room} session ${s.status === 'active' ? 'paused' : 'resumed'}`);
          closeAll();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Could not change session state');
        }
        return;
      }
      case 'extend-15': {
        setProcessingAction(actionId);
        const s = await requireLiveSession();
        setProcessingAction(null);
        if (!s) return;
        try {
          await extendSession(s.id, 15);
          toast.success(`+15 minutes added to ${room.name}`);
          closeAll();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Could not extend time');
        }
        return;
      }
      case 'transfer-room': {
        toast.info('Room transfer needs backend support — not wired yet');
        return;
      }
      case 'print-receipt': {
        setProcessingAction(actionId);
        const s = await requireLiveSession();
        setProcessingAction(null);
        if (!s) return;
        downloadReceiptPdf(s);
        toast.success('Receipt PDF generated');
        return;
      }
      case 'edit-notes':
      case 'add-maintenance-note': {
        setDialog({ kind: 'notes', value: room.note ?? '' });
        return;
      }
      case 'edit-reservation':
      case 'cancel-reservation': {
        setProcessingAction(actionId);
        try {
          const all = await reservationsApi.list();
          const target = all.find(
            (r) =>
              r.room === room.name &&
              (r.status === 'Reserved' || r.status === 'Waiting' || r.status === 'Late')
          );
          setProcessingAction(null);
          if (!target) {
            toast.error(`No upcoming reservation found for ${room.name}`);
            return;
          }
          if (actionId === 'cancel-reservation')
            setDialog({ kind: 'confirm-cancel', reservationId: target.id });
          else
            setDialog({
              kind: 'edit-res',
              reservationId: target.id,
              time: target.time,
              date: target.date,
              players: target.players,
            });
        } catch (err) {
          setProcessingAction(null);
          toastApiError(err);
        }
        return;
      }
      default:
        return;
    }
  };

  const submitStartSession = async (guest: string, players: number) => {
    try {
      await startSession({
        p_room_id: room.id,
        p_guest_name: guest.trim(),
        p_phone: '',
        p_game: '',
        p_players: Math.max(1, players),
        p_session_kind: 'open',
        p_fixed_duration_minutes: null,
        p_customer_id: null,
        p_reservation_id: null,
      });
      toast.success(`Session started in ${room.name}`);
      onStatusChange?.('occupied');
      closeAll();
    } catch (err) {
      toastApiError(err);
    }
  };

  const submitNotes = async (note: string) => {
    onStatusChange?.(room.status, note.trim());
    toast.success('Note saved');
    closeAll();
  };

  const submitEditReservation = async (
    time: string,
    date: string,
    players: number,
    reservationId?: string
  ) => {
    if (!reservationId) return;
    try {
      await reservationsApi.update(reservationId, {
        time,
        date,
        players: Math.max(1, players),
      });
      toast.success('Reservation updated');
      closeAll();
    } catch (err) {
      toastApiError(err);
    }
  };
  const submitCancelReservation = async (reservationId?: string) => {
    if (!reservationId) return;
    try {
      await reservationsApi.update(reservationId, { status: 'Cancelled' });
      toast.success('Reservation cancelled');
      onStatusChange?.('available');
      closeAll();
    } catch (err) {
      toastApiError(err);
    }
  };

  return (
    <>
      {/* Direct card-face actions — no navigation, no extra clicks */}
      {variant === 'inline' && (
        <div
          className="flex items-center gap-1.5"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {(INLINE_ACTIONS[room.status] ?? []).map((id) => {
            const def = actions.find((a) => a.id === id);
            if (!def) return null;
            return (
              <button
                key={id}
                type="button"
                disabled={processingAction !== null}
                title={def.label}
                onClick={() => void runAction(id)}
                className={`qa-tile flex-1 h-8 rounded-lg border text-[11px] font-bold uppercase tracking-wide flex items-center justify-center gap-1 disabled:opacity-50 ${toneClasses[def.tone]}`}
              >
                {processingAction === id ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  def.icon
                )}
                <span className="hidden xl:inline truncate">{def.label}</span>
              </button>
            );
          })}
          {/* Overflow — full actions modal */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(true);
            }}
            title="More actions"
            aria-haspopup="dialog"
            className="w-8 h-8 shrink-0 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40 flex items-center justify-center transition-all"
          >
            <Settings2 size={14} />
          </button>
        </div>
      )}

      {/* Trigger button — aligned to the primary checkout (.btn-primary) language */}
      {variant === 'button' && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          onKeyDown={(e) => e.stopPropagation()}
          title="Quick Actions"
          aria-haspopup="dialog"
          className={`btn-primary w-full h-8 flex items-center justify-center gap-1.5 !text-[11px] uppercase tracking-wider ${className}`}
        >
          <Settings2 size={13} />
          Quick Actions
        </button>
      )}

      {/* Actions modal — portaled to body so fixed positioning escapes glass cards */}
      {open && (
        <Portal>
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
            onClick={closeAll}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`Quick actions for ${room.name}`}
              className="glass-panel pop-in w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-7 py-5 border-b border-border shrink-0">
                <div className="min-w-0">
                  <h3 className="text-xl font-extrabold tracking-tight text-foreground truncate">
                    {room.name}
                  </h3>
                  <div className="flex items-center gap-2.5 mt-1.5">
                    <span className={`status-badge capitalize ${statusBadge[room.status]}`}>
                      {room.status}
                    </span>
                    <span className="text-sm text-muted-foreground">{room.type}</span>
                  </div>
                </div>
                <button
                  onClick={closeAll}
                  className="w-9 h-9 shrink-0 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Close quick actions"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-7 grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto scrollbar-thin">
                {actions.map((a) => (
                  <button
                    key={a.id}
                    disabled={processingAction !== null}
                    onClick={() => void runAction(a.id)}
                    className={`flex items-center gap-3.5 px-5 py-5 rounded-xl border text-base font-bold transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed text-left min-w-0 ${toneClasses[a.tone]}`}
                  >
                    {processingAction === a.id ? (
                      <Loader2 size={22} className="animate-spin shrink-0" />
                    ) : (
                      <span className="shrink-0">{a.icon}</span>
                    )}
                    <span className="leading-snug">{a.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* ── Inline sub-dialogs ─────────────────────────── */}

      {/* Start Session mini-form (reuses start_session RPC via lib/api/sessions) */}
      {dialog?.kind === 'start-session' && (
        <Portal>
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
            <div className="glass-panel pop-in w-full max-w-sm rounded-2xl p-5">
              <h4 className="text-sm font-bold text-foreground mb-4">Start Session · {room.name}</h4>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Guest name
              </label>
              <input
                autoFocus
                value={dialog.guest}
                onChange={(e) => setDialog({ ...dialog, guest: e.target.value })}
                placeholder="Walk-in guest"
                className="input-field mb-3"
              />
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Players
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={dialog.players}
                onChange={(e) => setDialog({ ...dialog, players: Number(e.target.value) || 1 })}
                className="input-field mb-4"
              />
              <div className="flex gap-2">
                <button onClick={() => setDialog(null)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button
                  onClick={() => void submitStartSession(dialog.guest, dialog.players)}
                  className="btn-primary flex-1"
                >
                  Start
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Notes dialog */}
      {dialog?.kind === 'notes' && (
        <Portal>
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
            <div className="glass-panel pop-in w-full max-w-sm rounded-2xl p-5">
              <h4 className="text-sm font-bold text-foreground mb-3">Notes · {room.name}</h4>
              <textarea
                autoFocus
                rows={4}
                value={dialog.value}
                onChange={(e) => setDialog({ ...dialog, value: e.target.value })}
                placeholder="Add a note…"
                className="input-field resize-none mb-4"
              />
              <div className="flex gap-2">
                <button onClick={() => setDialog(null)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button
                  onClick={() => void submitNotes(dialog.value)}
                  className="btn-primary flex-1"
                >
                  Save Note
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Edit reservation dialog (reservationsApi.update) */}
      {dialog?.kind === 'edit-res' && (
        <Portal>
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
            <div className="glass-panel pop-in w-full max-w-sm rounded-2xl p-5">
              <h4 className="text-sm font-bold text-foreground mb-4">
                Edit Reservation · {room.name}
              </h4>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={dialog.date}
                onChange={(e) => setDialog({ ...dialog, date: e.target.value })}
                className="input-field mb-3"
              />
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Time
              </label>
              <input
                type="time"
                value={dialog.time}
                onChange={(e) => setDialog({ ...dialog, time: e.target.value })}
                className="input-field mb-3"
              />
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Players
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={dialog.players}
                onChange={(e) => setDialog({ ...dialog, players: Number(e.target.value) || 1 })}
                className="input-field mb-4"
              />
              <div className="flex gap-2">
                <button onClick={() => setDialog(null)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button
                  onClick={() => {
                    void submitEditReservation(
                      dialog.time,
                      dialog.date,
                      dialog.players,
                      dialog.reservationId
                    );
                  }}
                  className="btn-primary flex-1"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Cancel reservation confirmation (existing danger styling) */}
      {dialog?.kind === 'confirm-cancel' && (
        <Portal>
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
            <div className="glass-panel pop-in w-full max-w-sm rounded-2xl p-5 text-center">
              <Ban size={28} className="mx-auto text-danger mb-3" />
              <h4 className="text-sm font-bold text-foreground">Cancel this reservation?</h4>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                The reservation for {room.name} will be marked as Cancelled.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setDialog(null)} className="btn-secondary flex-1">
                  Keep It
                </button>
                <button
                  onClick={() => {
                    void submitCancelReservation(dialog.reservationId);
                  }}
                  className="flex-1 btn-danger"
                >
                  Cancel Reservation
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* ── Reused full flows ──────────────────────────── */}

      {paymentTarget && (
        <Portal>
          <PaymentModal
            session={paymentTarget}
            elapsedMin={computeBill(paymentTarget).elapsed}
            onClose={() => setPaymentTarget(null)}
            onConfirmPayment={handleConfirmPayment}
            onPaymentComplete={(sessionId) => {
              setEvaluationTarget(paymentTarget.id === sessionId ? paymentTarget : null);
              setPaymentTarget(null);
              onStatusChange?.('available');
            }}
          />
        </Portal>
      )}
      {evaluationTarget && (
        <Portal>
          <EvaluationPopup session={evaluationTarget} onComplete={() => setEvaluationTarget(null)} />
        </Portal>
      )}
      {addDrinksTarget && (
        <Portal>
          <AddProductModal
            session={addDrinksTarget}
            onClose={() => setAddDrinksTarget(null)}
            onAdd={async (sessionId, product) => {
              setAddDrinksTarget(null);
              try {
                await addSessionProduct({
                  sessionId,
                  productId:
                    'productId' in product ? String(product.productId ?? '') || null : null,
                  name: product.name,
                  price: Number(product.price),
                  qty: product.qty,
                });
                toast.success(`${product.name} ×${product.qty} added to the bill`);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Could not add product');
              }
            }}
          />
        </Portal>
      )}
      {bookOpen && (
        <Portal>
          <QuickBookModal
          createdBy="staff"
          onClose={() => setBookOpen(false)}
          onSave={async (res) => {
            setBookOpen(false);
            try {
              await reservationsApi.create({
                customer_id: null,
                guest_name: res.customer,
                phone: res.phone,
                room_id: UUID_RE.test(room.id) ? room.id : null,
                category: res.category ?? 'playstation',
                game: res.game,
                players: res.players,
                res_date: res.date,
                res_time: res.time,
                duration_minutes: res.duration ? Number(res.duration) : null,
                session_kind: res.sessionType,
                notes: res.notes ?? null,
                created_by_role: 'staff',
              });
              toast.success(`Room reserved · ${res.customer}`);
              onStatusChange?.('reserved');
              setOpen(false);
            } catch (err) {
              toastApiError(err);
            }
          }}
          />
        </Portal>
      )}
    </>
  );
}
