'use client';
import React, { useEffect, useRef, useState } from 'react';
import CustomerProfileModal from './CustomerProfileModal';
import { Crown, Search, Sparkles, Trash2, TrendingUp, UserPlus, Users, X } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { customersApi, useAsyncData, toastApiError } from '@/lib/api';
import type { UiCustomer } from '@/lib/api';

const tiers: (UiCustomer['tier'] | 'All')[] = ['All', 'Bronze', 'Silver', 'Gold', 'VIP'];

const tierStyles: Record<UiCustomer['tier'], string> = {
  Bronze: 'bg-muted text-muted-foreground border border-border',
  Silver: 'bg-info/10 text-info border border-info/20',
  Gold: 'bg-warning/10 text-warning border border-warning/20',
  VIP: 'bg-vip/10 text-vip border border-vip/20',
};

const quickPoints = [100, 250, 500, 1000];

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function CustomersContent() {
  const { data, loading, reload } = useAsyncData(() => customersApi.list(), []);
  const customers = data ?? [];
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<UiCustomer['tier'] | 'All'>('All');
  const [addOpen, setAddOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [pointsTarget, setPointsTarget] = useState<UiCustomer | null>(null);
  const [profileTarget, setProfileTarget] = useState<UiCustomer | null>(null);
  const [pointsAmount, setPointsAmount] = useState(100);
  const confirmRef = useRef<number | null>(null);

  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    notes: '',
  });

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) setSearchQuery(q);
    return () => {
      if (confirmRef.current) window.clearTimeout(confirmRef.current);
    };
  }, []);

  if (loading) {
    return <div className="glass-panel p-10 text-center text-muted-foreground">Loading…</div>;
  }

  const filtered = customers.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q);
    const matchesTier = tierFilter === 'All' || c.tier === tierFilter;
    return matchesSearch && matchesTier;
  });

  const vipCount = customers.filter((c) => c.tier === 'VIP').length;
  const totalPoints = customers.reduce((sum, c) => sum + c.loyaltyPoints, 0);
  const avgSpend = customers.length
    ? Math.round(customers.reduce((sum, c) => sum + c.totalSpent, 0) / customers.length)
    : 0;

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name.trim()) {
      toast.error('Customer name is required');
      return;
    }
    try {
      await customersApi.create({
        name: newCustomer.name.trim(),
        phone: newCustomer.phone.trim() || '—',
        email: newCustomer.email.trim() || '—',
        notes: newCustomer.notes.trim(),
      });
      setNewCustomer({ name: '', phone: '', email: '', notes: '' });
      setAddOpen(false);
      toast.success(`${newCustomer.name.trim()} added to customers`);
      reload();
    } catch (err) {
      toastApiError(err);
    }
  };

  const handleDelete = async (customer: UiCustomer) => {
    if (confirmId !== customer.id) {
      setConfirmId(customer.id);
      if (confirmRef.current) window.clearTimeout(confirmRef.current);
      confirmRef.current = window.setTimeout(() => setConfirmId(null), 3000);
      return;
    }
    if (confirmRef.current) window.clearTimeout(confirmRef.current);
    setConfirmId(null);
    try {
      await customersApi.remove(customer.id);
      toast.success(`${customer.name} removed from customers`);
      reload();
    } catch (err) {
      toastApiError(err);
    }
  };

  const handleAddPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pointsTarget) return;
    const amount = Math.max(0, Math.round(Number(pointsAmount) || 0));
    if (amount <= 0) {
      toast.error('Enter a positive points amount');
      return;
    }
    try {
      await customersApi.adjustPoints(pointsTarget.id, amount, 'Manual points added');
      toast.success(`Added ${amount} points — ${pointsTarget.name}`);
      setPointsTarget(null);
      setPointsAmount(100);
      reload();
    } catch (err) {
      toastApiError(err);
    }
  };

  return (
    <div className="p-4 lg:p-6 xl:p-8 max-w-screen-2xl mx-auto space-y-6">
      <Toaster position="bottom-right" theme="system" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {customers.length} profiles — manage loyalty, visits, and spend
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="btn-primary flex items-center gap-2 h-9"
        >
          <UserPlus size={14} />
          Add Customer
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-base p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Users size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Customers</p>
              <p className="text-lg font-bold text-foreground font-tabular">{customers.length}</p>
            </div>
          </div>
        </div>
        <div className="card-base p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-vip/10 border border-vip/20 flex items-center justify-center">
              <Crown size={18} className="text-vip" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">VIP Members</p>
              <p className="text-lg font-bold text-foreground font-tabular">{vipCount}</p>
            </div>
          </div>
        </div>
        <div className="card-base p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Sparkles size={18} className="text-accent" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Points Issued</p>
              <p className="text-lg font-bold text-foreground font-tabular">
                {totalPoints.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className="card-base p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning/10 border border-warning/20 flex items-center justify-center">
              <TrendingUp size={18} className="text-warning" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Spend / Customer</p>
              <p className="text-lg font-bold text-foreground font-tabular">
                {avgSpend.toLocaleString()} EGP
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone, or email..."
            className="input-field pl-9"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {tiers.map((t) => (
            <button
              key={t}
              onClick={() => setTierFilter(t as UiCustomer['tier'] | 'All')}
              className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-colors border ${
                tierFilter === t
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card-base overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Customer
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Phone
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Tier
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Visits
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Total Spent
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Points
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Last Visit
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    <Users size={24} className="mx-auto mb-2 opacity-50" />
                    No customers match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((customer) => (
                  <tr
                    key={customer.id}
                    onClick={() => setProfileTarget(customer)}
                    className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-primary">
                            {initials(customer.name)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{customer.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-tabular">
                      {customer.phone}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`status-badge ${tierStyles[customer.tier]}`}>
                        {customer.tier}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-tabular text-muted-foreground">
                      {customer.visits}
                    </td>
                    <td className="px-4 py-3 text-right font-tabular font-semibold text-foreground">
                      {customer.totalSpent.toLocaleString()} EGP
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPointsTarget(customer);
                          setPointsAmount(100);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/70 transition-colors"
                        title="Add loyalty points"
                      >
                        <Sparkles size={13} />
                        {customer.loyaltyPoints.toLocaleString()}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-tabular">
                      {customer.lastVisit}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPointsTarget(customer);
                        }}
                        className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors"
                        title="Add points"
                      >
                        <Sparkles size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(customer);
                        }}
                        className={`ml-2 p-1.5 rounded-lg border transition-colors ${
                          confirmId === customer.id
                            ? 'bg-danger/10 border-danger/40 text-danger'
                            : 'bg-muted border-border text-muted-foreground hover:text-danger hover:border-danger/40'
                        }`}
                        title={confirmId === customer.id ? 'Click again to confirm' : 'Delete'}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60" onClick={() => setAddOpen(false)} />
          <div className="relative w-full max-w-md card-base p-6 fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Add Customer</h2>
              <button
                onClick={() => setAddOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Name</label>
                <input
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  placeholder="e.g. Ahmed Khalil"
                  className="input-field"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Phone
                  </label>
                  <input
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    placeholder="0100-xxx-0000"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Email
                  </label>
                  <input
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    placeholder="name@email.com"
                    className="input-field"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Notes</label>
                <textarea
                  value={newCustomer.notes}
                  onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                  placeholder="Preferences, regular orders..."
                  rows={3}
                  className="input-field resize-none"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className="btn-secondary flex-1 h-10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1 h-10 flex items-center justify-center gap-2"
                >
                  <UserPlus size={14} />
                  Add Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Points Modal */}
      {pointsTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60" onClick={() => setPointsTarget(null)} />
          <div className="relative w-full max-w-md card-base p-6 fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Add Loyalty Points</h2>
              <button
                onClick={() => setPointsTarget(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary">
                  {initials(pointsTarget.name)}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{pointsTarget.name}</p>
                <p className="text-xs text-muted-foreground">
                  {pointsTarget.loyaltyPoints.toLocaleString()} points · {pointsTarget.tier} tier
                </p>
              </div>
            </div>
            <form onSubmit={handleAddPoints} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Points to add
                </label>
                <input
                  type="number"
                  min="0"
                  value={pointsAmount}
                  onChange={(e) => setPointsAmount(Number(e.target.value))}
                  className="input-field"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {quickPoints.map((amount) => (
                  <button
                    key={`qp-${amount}`}
                    type="button"
                    onClick={() => setPointsAmount(amount)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 ${
                      pointsAmount === amount
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'bg-muted border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    +{amount}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPointsTarget(null)}
                  className="btn-secondary flex-1 h-10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1 h-10 flex items-center justify-center gap-2"
                >
                  <Sparkles size={14} />
                  Add Points
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Profile */}
      {profileTarget && (
        <CustomerProfileModal
          customer={profileTarget}
          onClose={() => setProfileTarget(null)}
        />
      )}
    </div>
  );
}
