'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import LiveSessionsHeader from './LiveSessionsHeader';
import SessionsGrid from './SessionsGrid';
import PaymentModal from './PaymentModal';
import EvaluationPopup from './EvaluationPopup';
import AddProductModal from './AddProductModal';
import QuickActionModal, { type QuickActionTarget } from './QuickActionModal';
import QuickActionsMenu from './QuickActionsMenu';
import { Toaster } from 'sonner';
import { MapPin } from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchLiveSessions,
  subscribeLiveFloor,
  pauseSession,
  resumeSession,
  extendSession,
  addSessionProduct,
  endSession,
  type UiLiveSession,
} from '@/lib/api/sessions';
import type { CompletedSale } from '@/lib/api/sessions';
import { computeBill } from '@/lib/billing';
import { ZONES } from '../../../data/zones';
import type { ZoneSession } from '../../../data/zones';

export type { UiLiveSession as LiveSession };

/** Product line used by the session modals (catalog or ad-hoc). */
export interface SessionProduct {
  id?: string;
  productId?: string | null;
  name: string;
  price: number;
  qty: number;
}

  const REFRESH_DEBOUNCE_MS = 400;

export default function LiveSessionsContent() {
  const [sessions, setSessions] = useState<UiLiveSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [, setNowMs] = useState(() => Date.now());
  const [paymentTarget, setPaymentTarget] = useState<UiLiveSession | null>(null);
  const [paymentElapsedMin, setPaymentElapsedMin] = useState(0);
  const [evaluationTarget, setEvaluationTarget] = useState<UiLiveSession | null>(null);
  const [addProductTarget, setAddProductTarget] = useState<UiLiveSession | null>(null);
  const [quickActionTarget, setQuickActionTarget] = useState<UiLiveSession | null>(null);
  const [zoneMenuOpen, setZoneMenuOpen] = useState(false);
  const [zoneQuickActionTarget, setZoneQuickActionTarget] = useState<ZoneSession | null>(null);

  const reload = useCallback(async () => {
    try {
      const data = await fetchLiveSessions();
      setSessions(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load live sessions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Optimistic-update guard: while a mutation is in flight we suppress
   * realtime-triggered refetches so the optimistic UI is not clobbered
   * (flash/duplicate rows). One reconciling reload runs after settle.
   */
  const pendingMutationsRef = useRef(0);
  const suppressedChangeRef = useRef(false);
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const beginMutation = () => {
    pendingMutationsRef.current += 1;
  };

  const endMutation = useCallback(
    (didFail: boolean) => {
      pendingMutationsRef.current = Math.max(0, pendingMutationsRef.current - 1);
      if (pendingMutationsRef.current === 0 && suppressedChangeRef.current) {
        suppressedChangeRef.current = false;
        void reload();
      } else if (didFail) {
        void reload();
      }
    },
    [reload]
  );

  // Initial load + realtime subscription: every client sees starts/pauses/
  // checkouts/product lines the moment they are committed — no polling.
  useEffect(() => {
    void reload();
    const unsubscribe = subscribeLiveFloor({
      onChange: () => {
        if (pendingMutationsRef.current > 0) {
          suppressedChangeRef.current = true;
          return;
        }
        if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
        reloadTimerRef.current = setTimeout(() => void reload(), REFRESH_DEBOUNCE_MS);
      },
    });
    return () => {
      unsubscribe();
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    };
  }, [reload]);

  // Display-only ticker so timers advance between realtime events.
  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
      setSessions((prev) =>
        prev.map((s) => ({
          ...s,
          startMinutesAgo: computeBill(s).elapsed,
        }))
      );
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const sessionToTarget = (session: UiLiveSession): QuickActionTarget => ({
    ...session,
    label: session.room,
  });

  const handleAddProduct = async (sessionId: string, product: SessionProduct) => {
    setAddProductTarget(null);
    // Optimistic line append; realtime refetch reconciles with the server.
    // The id prefix lets any merge logic recognize client-only lines.
    beginMutation();
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== sessionId) return s;
        const existing = s.products.find((p) => p.name === product.name);
        if (existing) {
          return {
            ...s,
            products: s.products.map((p) =>
              p.name === product.name ? { ...p, qty: p.qty + product.qty } : p
            ),
          };
        }
        return {
          ...s,
          products: [
            ...s.products,
            {
              id: product.id ?? `optimistic-${sessionId}-${Date.now()}`,
              name: product.name,
              price: product.price,
              qty: product.qty,
            },
          ],
        };
      })
    );
    let failed = false;
    try {
      await addSessionProduct({
        sessionId,
        productId: 'productId' in product ? String(product.productId ?? '') || null : null,
        name: product.name,
        price: Number(product.price),
        qty: product.qty,
      });
      toast.success(`${product.name} ×${product.qty} added to the bill`);
    } catch (err) {
      failed = true;
      toast.error(err instanceof Error ? err.message : 'Could not add product');
    } finally {
      endMutation(failed);
    }
  };

  const handleTogglePause = async (sessionId: string) => {
    const target = sessions.find((s) => s.id === sessionId);
    if (!target) return;
    const goingPaused = target.status === 'active';
    // Optimistic flip
    beginMutation();
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId ? { ...s, status: goingPaused ? 'paused' : 'active' } : s
      )
    );
    let failed = false;
    try {
      if (goingPaused) await pauseSession(sessionId);
      else await resumeSession(sessionId);
    } catch (err) {
      failed = true;
      toast.error(err instanceof Error ? err.message : 'Could not change session state');
    } finally {
      endMutation(failed);
    }
  };

  const handleEndSession = (session: UiLiveSession, elapsedMin: number) => {
    setPaymentElapsedMin(elapsedMin);
    setPaymentTarget(session);
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

  const handlePaymentComplete = (sessionId: string) => {
    setPaymentTarget(null);
    const session = sessions.find((s) => s.id === sessionId);
    if (session) setEvaluationTarget(session);
    else void reload();
  };

  const handleEvaluationComplete = (sessionId: string) => {
    setEvaluationTarget(null);
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  };

  const handleQuickAction = async (args: {
    productId: string;
    quantity: number;
    extendMinutes: number;
  }): Promise<{ ok: boolean; error?: string }> => {
    const target = quickActionTarget;
    if (!target) return { ok: false, error: 'No session selected' };
    beginMutation();
    let failed = false;
    try {
      const calls: Promise<void>[] = [];
      if (args.extendMinutes > 0) calls.push(extendSession(target.id, args.extendMinutes));
      if (args.quantity > 0) {
        calls.push(
          addSessionProduct({
            sessionId: target.id,
            productId: args.productId.startsWith('prod-') ? null : args.productId,
            name: 'Energy Drink',
            price: 45,
            qty: args.quantity,
          })
        );
      }
      await Promise.all(calls);
      toast.success(`+${args.extendMinutes}min added · ${args.quantity} drink(s) on the bill`);
      void reload();
      return { ok: true };
    } catch (err) {
      failed = true;
      return { ok: false, error: err instanceof Error ? err.message : 'Quick action failed' };
    } finally {
      endMutation(failed);
    }
  };

  const activeCount = sessions.filter((s) => s.status === 'active').length;
  const liveRevenue = sessions.reduce((sum, s) => sum + computeBill(s).subtotal, 0);
  const pendingOrders = sessions.reduce(
    (sum, s) => sum + s.products.reduce((p, prod) => p + prod.qty, 0),
    0
  );

  return (
    <div className="relative p-4 lg:p-6 xl:p-8 max-w-screen-2xl mx-auto">
      <div className="pointer-events-none absolute -top-32 -right-24 w-96 h-96 bg-primary/15 rounded-full blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 w-96 h-96 bg-accent/10 rounded-full blur-[120px]" />
      <div className="relative">
        <Toaster position="bottom-right" theme="system" />
        <LiveSessionsHeader
          sessionCount={sessions.length}
          onQuickStart={() => setZoneMenuOpen(true)}
        />
        {isLoading && sessions.length === 0 ? (
          <div className="glass-panel rounded-xl p-16 text-center text-sm text-muted-foreground">
            Connecting to live floor…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="glass-panel rounded-xl p-5 glow-hover">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  Active Stations
                </p>
                <p className="text-3xl font-bold text-foreground font-tabular">
                  {activeCount}
                  <span className="text-lg font-semibold text-muted-foreground">/10</span>
                </p>
              </div>
              <div className="glass-panel rounded-xl p-5 glow-hover">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  Live Revenue
                </p>
                <p className="text-3xl font-bold text-accent font-tabular">
                  {liveRevenue.toLocaleString()}{' '}
                  <span className="text-sm font-semibold text-accent/70">EGP</span>
                </p>
              </div>
              <div className="glass-panel rounded-xl p-5 glow-hover">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  Pending Orders
                </p>
                <p className="text-3xl font-bold text-warning font-tabular">{pendingOrders}</p>
              </div>
              <button className="glass-panel rounded-xl p-5 glow-hover text-left flex items-center gap-3 group hover:border-primary/50 transition-all duration-200">
                <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 text-primary flex items-center justify-center flex-shrink-0">
                  <MapPin size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-primary group-hover:underline underline-offset-2">
                    View Floor Plan
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Open interactive map</p>
                </div>
              </button>
            </div>
            <SessionsGrid
              sessions={sessions}
              onAddProduct={(s) => setAddProductTarget(s)}
              onQuickAction={(s) => setQuickActionTarget(s)}
              onTogglePause={handleTogglePause}
              onEndSession={handleEndSession}
            />
          </>
        )}
        {paymentTarget && (
          <PaymentModal
            session={paymentTarget}
            elapsedMin={paymentElapsedMin}
            onClose={() => setPaymentTarget(null)}
            onConfirmPayment={handleConfirmPayment}
            onPaymentComplete={handlePaymentComplete}
          />
        )}
        {evaluationTarget && (
          <EvaluationPopup session={evaluationTarget} onComplete={handleEvaluationComplete} />
        )}
        {addProductTarget && (
          <AddProductModal
            session={addProductTarget}
            onClose={() => setAddProductTarget(null)}
            onAdd={handleAddProduct}
          />
        )}
        {quickActionTarget && (
          <QuickActionModal
            target={sessionToTarget(quickActionTarget)}
            applyAction={handleQuickAction}
            onClose={() => setQuickActionTarget(null)}
            onApply={() => setQuickActionTarget(null)}
          />
        )}
        {zoneMenuOpen && (
          <QuickActionsMenu
            zones={ZONES}
            onClose={() => setZoneMenuOpen(false)}
            onSelect={(zone) => {
              setZoneMenuOpen(false);
              setZoneQuickActionTarget(zone);
            }}
          />
        )}
        {zoneQuickActionTarget && (
          <QuickActionModal
            target={{ ...zoneQuickActionTarget, label: zoneQuickActionTarget.zoneName }}
            apiPath="/api/zones/quick-action"
            onClose={() => setZoneQuickActionTarget(null)}
            onApply={(updated) => {
              void updated;
              setZoneQuickActionTarget(null);
              toast.info('Station state is visual-only until zones migration');
            }}
          />
        )}
      </div>
    </div>
  );
}
