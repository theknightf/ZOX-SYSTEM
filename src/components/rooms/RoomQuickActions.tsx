'use client';
import React, { useMemo, useState } from 'react';
import {
  Play,
  CalendarPlus,
  SprayCan,
  Wrench,
  Square,
  CupSoda,
  UserPlus,
  Pause,
  ArrowLeftRight,
  Printer,
  StickyNote,
  CalendarCog,
  Ban,
  CheckCircle2,
  X,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchLiveSessions,
  pauseSession,
  resumeSession,
  startSession,
  endSession,
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
    { id: 'start-session', label: 'Start Session', icon: <Play size={16} />, tone: 'accent' },
    { id: 'reserve-room', label: 'Reserve Room', icon: <CalendarPlus size={16} />, tone: 'primary' },
    { id: 'mark-cleaning', label: 'Mark as Cleaning', icon: <SprayCan size={16} />, tone: 'warning' },
    { id: 'mark-maintenance', label: 'Put Under Maintenance', icon: <Wrench size={16} />, tone: 'neutral' },
  ],
  occupied: [
    { id: 'end-session', label: 'End Session', icon: <Square size={16} />, tone: 'danger' },
    { id: 'add-drinks', label: 'Add Drinks', icon: <CupSoda size={16} />, tone: 'primary' },
    { id: 'add-guest', label: 'Add Guest', icon: <UserPlus size={16} />, tone: 'primary' },
    { id: 'pause-session', label: 'Pause Session', icon: <Pause size={16} />, tone: 'warning' },
    { id: 'transfer-room', label: 'Transfer Room', icon: <ArrowLeftRight size={16} />, tone: 'neutral' },
    { id: 'print-receipt', label: 'Print Receipt', icon: <Printer size={16} />, tone: 'neutral' },
    { id: 'edit-notes', label: 'Add/Edit Notes', icon: <StickyNote size={16} />, tone: 'neutral' },
  ],
  reserved: [
    { id: 'start-session', label: 'Start Session', icon: <Play size={16} />, tone: 'accent' },
    { id: 'edit-reservation', label: 'Edit Reservation', icon: <CalendarCog size={16} />, tone: 'primary' },
    { id: 'cancel-reservation', label: 'Cancel Reservation', icon: <Ban size={16} />, tone: 'danger' },
    { id: 'mark-cleaning', label: 'Mark as Cleaning', icon: <SprayCan size={16} />, tone: 'warning' },
    { id: 'mark-maintenance', label: 'Put Under Maintenance', icon: <Wrench size={16} />, tone: 'neutral' },
  ],
  maintenance: [
    { id: 'mark-available', label: 'Mark as Available', icon: <CheckCircle2 size={16} />, tone: 'accent' },
    { id: 'mark-cleaning', label: 'Mark as Cleaning', icon: <SprayCan size={16} />, tone: 'warning' },
    { id: 'add-maintenance-note', label: 'Add Maintenance Note', icon: <StickyNote size={16} />, tone: 'neutral' },
  ],
};

const statusBadge: Record<RoomStatus, string> = {
  available: 'bg-success/10 text-success',
  occupied: 'bg-danger/10 text-danger',
  reserved: 'bg-warning/10 text-warning',
  maintenance: 'bg-muted text-muted-foreground',
};

const toneClasses: Record<ActionTone, string> = {
  primary: 'border-primary/25 bg-primary/10 text-primary hover:bg-primary/20',
  accent: 'border-accent/25 bg-accent/10 text-accent hover:bg-accent/20',
  warning: 'border-warning/25 bg-warning/10 text-warning hover:bg-warning/20',
  danger: 'border-danger/30 bg-danger/10 text-danger hover:bg-danger/20',
  neutral: 'border-border bg-card text-muted-foreground hover:text-foreground',
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
}

export default function RoomQuickActions({ room, onStatusChange, className = '' }: RoomQuickActionsProps) {
  const [open, setOpen] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
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
        setBusyAction(actionId);
        const s = await requireLiveSession();
        setBusyAction(null);
        if (!s) return;
        setPaymentTarget(s);
        setOpen(false);
        return;
      }
      case 'add-drinks': {
        setBusyAction(actionId);
        const s = await requireLiveSession();
        setBusyAction(null);
        if (!s) return;
        setAddDrinksTarget(s);
        setOpen(false);
        return;
      }
      case 'pause-session': {
        setBusyAction(actionId);
        const s = await requireLiveSession();
        setBusyAction(null);
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
      case 'transfer-room': {
        toast.info('Room transfer needs backend support — not wired yet');
        return;
      }
      case 'print-receipt': {
        setBusyAction(actionId);
        const s = await requireLiveSession();
        setBusyAction(null);
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
        setBusyAction(actionId);
        try {
          const all = await reservationsApi.list();
          const target = all.find(
            (r) =>
              r.room === room.name &&
              (r.status === 'Reserved' || r.status === 'Waiting' || r.status === 'Late')
          );
          setBusyAction(null);
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
          setBusyAction(null);
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
      {/* Trigger button — independent of card click */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        title="Quick Actions"
        className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-border bg-card text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all ${className}`}
      >
        Quick Actions
      </button>

      {/* Actions modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={closeAll}
        >
          <div
            className="glass-panel pop-in w-full max-w-md rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="text-base font-bold text-foreground">{room.name}</h3>
                <span
                  className={`status-badge mt-1 ${statusBadge[room.status]} capitalize`}
                >
                  {room.status}
                </span>
              </div>
              <button
                onClick={closeAll}
                className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close quick actions"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-2.5">
              {actions.map((a) => (
                <button
                  key={a.id}
                  disabled={busyAction !== null}
                  onClick={() => void runAction(a.id)}
                  className={`flex items-center gap-2.5 px-3 py-3 rounded-xl border text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 text-left ${toneClasses[a.tone]}`}
                >
                  {busyAction === a.id ? (
                    <Loader2 size={16} className="animate-spin shrink-0" />
                  ) : (
                    <span className="shrink-0">{a.icon}</span>
                  )}
                  <span className="leading-tight">{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Inline sub-dialogs ─────────────────────────── */}

      {/* Start Session mini-form (reuses start_session RPC via lib/api/sessions) */}
      {dialog?.kind === 'start-session' && (
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
      )}

      {/* Notes dialog */}
      {dialog?.kind === 'notes' && (
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
              <button onClick={() => void submitNotes(dialog.value)} className="btn-primary flex-1">
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit reservation dialog (reservationsApi.update) */}
      {dialog?.kind === 'edit-res' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="glass-panel pop-in w-full max-w-sm rounded-2xl p-5">
            <h4 className="text-sm font-bold text-foreground mb-4">Edit Reservation · {room.name}</h4>
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
      )}

      {/* Cancel reservation confirmation (existing danger styling) */}
      {dialog?.kind === 'confirm-cancel' && (
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
      )}

      {/* ── Reused full flows ──────────────────────────── */}

      {paymentTarget && (
        <PaymentModal
          session={paymentTarget}
          elapsedMin={computeBill(paymentTarget).elapsed}
          onClose={() => setPaymentTarget(null)}
          onConfirmPayment={handleConfirmPayment}
          onPaymentComplete={(sessionId) => {
            setEvaluationTarget(
              paymentTarget.id === sessionId ? paymentTarget : null
            );
            setPaymentTarget(null);
            onStatusChange?.('available');
          }}
        />
      )}
      {evaluationTarget && (
        <EvaluationPopup
          session={evaluationTarget}
          onComplete={() => setEvaluationTarget(null)}
        />
      )}
      {addDrinksTarget && (
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
      )}
      {bookOpen && (
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
      )}
    </>
  );
}
