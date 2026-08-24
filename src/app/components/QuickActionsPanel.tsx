import React from 'react';
import Link from 'next/link';
import {
  CalendarPlus,
  ShoppingBag,
  Gamepad2,
  PackageSearch,
  AlertCircle,
  Zap,
} from 'lucide-react';

interface QuickActionsPanelProps {
  onQuickAction: () => void;
}

const actions = [
  {
    id: 'qa-new-reservation',
    label: 'New Reservation',
    icon: <CalendarPlus size={20} />,
    href: '/reservations',
    color: 'text-primary',
    bg: 'bg-primary/10 border-primary/20 hover:bg-primary/20',
  },
  {
    id: 'qa-start-session',
    label: 'Add Product / Extend Time',
    icon: <Zap size={20} />,
    action: true,
    color: 'text-accent',
    bg: 'bg-accent/10 border-accent/20 hover:bg-accent/20',
  },
  {
    id: 'qa-quick-sale',
    label: 'Quick Sale',
    icon: <ShoppingBag size={20} />,
    href: '/sales',
    color: 'text-info',
    bg: 'bg-info/10 border-info/20 hover:bg-info/20',
  },
  {
    id: 'qa-report-hardware',
    label: 'Report Hardware',
    icon: <Gamepad2 size={20} />,
    href: '/hardware',
    color: 'text-warning',
    bg: 'bg-warning/10 border-warning/20 hover:bg-warning/20',
  },
  {
    id: 'qa-lost-found',
    label: 'Lost & Found',
    icon: <PackageSearch size={20} />,
    href: '/lost-found',
    color: 'text-muted-foreground',
    bg: 'bg-muted border-border hover:bg-muted/80',
  },
  {
    id: 'qa-report-issue',
    label: 'Report Issue',
    icon: <AlertCircle size={20} />,
    href: '/maintenance',
    color: 'text-danger',
    bg: 'bg-danger/10 border-danger/20 hover:bg-danger/20',
  },
];

export default function QuickActionsPanel({ onQuickAction }: QuickActionsPanelProps) {
  return (
    <div className="glass-panel rounded-xl p-4">
      <h2 className="text-sm font-semibold text-foreground mb-3">Quick Actions Hub</h2>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => {
          const inner = (
            <>
              <span
                className={`w-9 h-9 rounded-lg border flex items-center justify-center ${action.bg} ${action.color}`}
              >
                {action.icon}
              </span>
              <span className="text-[11px] font-semibold text-foreground leading-tight text-center">
                {action.label}
              </span>
            </>
          );
          const cls =
            'flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-xl bg-card/60 border border-border hover:border-primary/40 transition-all duration-200 active:scale-95 group';
          return 'action' in action ? (
            <button key={action.id} onClick={onQuickAction} className={cls}>
              {inner}
            </button>
          ) : (
            <Link key={action.id} href={action.href} className={cls}>
              {inner}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
