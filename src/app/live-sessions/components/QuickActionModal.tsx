'use client';
import React, { useState } from 'react';
import { X, Zap, Plus, Minus } from 'lucide-react';
import type { SessionProduct } from './LiveSessionsContent';
import {
  QUICK_ACTION_CONFIG,
  getQuickActionProduct,
  getQuickActionCost,
} from '../../../lib/roomQuickActions';
import { toast } from 'sonner';

export interface QuickActionTarget {
  id: string;
  label: string;
  customer: string;
  hourlyRate: number;
  sessionType: 'open' | 'fixed';
  fixedDurationMinutes?: number;
  extendedMinutes?: number;
  products: SessionProduct[];
}

export interface QuickActionResponse {
  ok: boolean;
  target?: QuickActionTarget;
  productAdded?: SessionProduct;
  timeExtended?: number;
  cost?: number;
  error?: string;
}

interface QuickActionModalProps {
  target: QuickActionTarget;
  apiPath?: string;
  applyAction?: (args: {
    productId: string;
    quantity: number;
    extendMinutes: number;
  }) => Promise<QuickActionResponse>;
  onClose: () => void;
  onApply: (updated: QuickActionTarget, result: QuickActionResponse) => void;
}

export default function QuickActionModal({
  target,
  apiPath,
  applyAction,
  onClose,
  onApply,
}: QuickActionModalProps) {
  const drink = getQuickActionProduct();
  const [quantity, setQuantity] = useState(QUICK_ACTION_CONFIG.quantity);
  const [extendMinutes, setExtendMinutes] = useState(QUICK_ACTION_CONFIG.extendMinutes);
  const [isProcessing, setIsProcessing] = useState(false);

  const cost = getQuickActionCost(drink.price, quantity, target.hourlyRate, extendMinutes);
  const totalDuration =
    (target.fixedDurationMinutes ?? 0) + (target.extendedMinutes ?? 0) + extendMinutes;

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      let result: QuickActionResponse;
      if (applyAction) {
        result = await applyAction({
          productId: drink.id,
          quantity,
          extendMinutes,
        });
      } else if (apiPath) {
        const res = await fetch(apiPath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // Send only the identifier + deltas — the server resolves its own state.
          body: JSON.stringify({
            id: target.id,
            productId: drink.id,
            quantity,
            extendMinutes,
          }),
        });
        result = (await res.json()) as QuickActionResponse;
      } else {
        toast.error('No quick-action backend configured');
        setIsProcessing(false);
        return;
      }
      if (result.ok && result.target) {
        onApply(result.target, result);
      } else {
        toast.error(result.error ?? 'Quick action failed');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Network error — quick action failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="fixed inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl slide-up max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-warning/15 border border-warning/25 text-warning flex items-center justify-center">
              <Zap size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Quick Action</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {target.label} · {target.customer}
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

        <div className="p-5 space-y-5 overflow-y-auto scrollbar-thin flex-1">
          {/* Drink */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              1 · Add drink to order
            </p>
            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{drink.emoji}</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{drink.name}</p>
                  <p className="text-xs text-muted-foreground">{drink.price} EGP / unit</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity === 1}
                  className="w-7 h-7 rounded-lg bg-muted border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 flex items-center justify-center transition-colors"
                >
                  <Minus size={12} />
                </button>
                <span className="w-6 text-center text-sm font-tabular font-bold text-foreground">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => Math.min(9, q + 1))}
                  className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 flex items-center justify-center transition-colors"
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* Extend time */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              2 · Extend time
            </p>
            <div className="grid grid-cols-3 gap-2">
              {QUICK_ACTION_CONFIG.durationOptions.map((minutes) => (
                <button
                  key={`dur-${minutes}`}
                  onClick={() => setExtendMinutes(minutes)}
                  className={`py-2.5 rounded-xl border text-sm font-semibold transition-all duration-150 active:scale-95 ${
                    extendMinutes === minutes
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-muted/30 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  +{minutes}min
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {target.sessionType === 'fixed'
                ? `New session length: ${totalDuration}min total`
                : `Time credit added to this ${target.hourlyRate > 0 ? 'session' : 'order'}`}
            </p>
          </div>

          {/* Cost summary */}
          <div className="bg-muted/40 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Charge Summary
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {drink.name} × {quantity}
              </span>
              <span className="font-tabular font-semibold text-foreground">
                {(drink.price * quantity).toLocaleString()} EGP
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Time (+{extendMinutes}min × {target.hourlyRate} EGP/hr)
              </span>
              <span className="font-tabular font-semibold text-foreground">
                {Math.round((extendMinutes / 60) * target.hourlyRate).toLocaleString()} EGP
              </span>
            </div>
            <div className="border-t border-border pt-2 mt-2 flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">Total to add</span>
              <span className="text-lg font-bold font-tabular text-foreground">
                {cost.toLocaleString()} EGP
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex-shrink-0">
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1" disabled={isProcessing}>
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isProcessing}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  <Zap size={14} />
                  Apply
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
