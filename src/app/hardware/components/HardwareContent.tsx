'use client';
import React, { useState } from 'react';
import {
  Package,
  Gamepad2,
  Gamepad,
  Headphones,
  Monitor,
  Cable,
  Plus,
  Search,
  Trash2,
  X,
  Boxes,
  CheckCircle2,
  Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { hardwareApi, useAsyncData, toastApiError, type UiHardwareItem } from '@/lib/api';

type HardwareType = UiHardwareItem['type'];
type HardwareStatus = UiHardwareItem['status'];
type HardwareItem = UiHardwareItem;

const typeFilters: (HardwareType | 'All')[] = [
  'All',
  'Console',
  'Controller',
  'Headset',
  'Monitor',
  'Cable',
];

const typeIcons: Record<HardwareType, LucideIcon> = {
  Console: Gamepad2,
  Controller: Gamepad,
  Headset: Headphones,
  Monitor: Monitor,
  Cable: Cable,
};

const typeBadgeStyles: Record<HardwareType, string> = {
  Console: 'bg-primary/10 text-primary border border-primary/20',
  Controller: 'bg-accent/10 text-accent border border-accent/20',
  Headset: 'bg-info/10 text-info border border-info/20',
  Monitor: 'bg-warning/10 text-warning border border-warning/20',
  Cable: 'bg-muted text-muted-foreground border border-border',
};

const conditionStyles: Record<HardwareItem['condition'], string> = {
  Excellent: 'text-accent',
  Good: 'text-info',
  Fair: 'text-warning',
  Poor: 'text-danger',
};

const statusStyles: Record<HardwareStatus, string> = {
  'In Use': 'bg-primary/10 text-primary border border-primary/20',
  Available: 'bg-accent/10 text-accent border border-accent/20',
  Maintenance: 'bg-warning/10 text-warning border border-warning/20',
  Retired: 'bg-muted text-muted-foreground border border-border',
};

const initialForm = {
  name: '',
  type: 'Controller' as HardwareType,
  model: '',
  serial: '',
  location: '',
  condition: 'Good' as HardwareItem['condition'],
};

export default function HardwareContent() {
  const { data, loading, reload } = useAsyncData(() => hardwareApi.list(), []);
  const items = data ?? [];
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<HardwareType | 'All'>('All');
  const [addOpen, setAddOpen] = useState(false);
  const [newItem, setNewItem] = useState(initialForm);

  const filtered = items.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.serial.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'All' || item.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const total = items.length;
  const inUse = items.filter((i) => i.status === 'In Use').length;
  const inMaintenance = items.filter((i) => i.status === 'Maintenance').length;
  const available = items.filter((i) => i.status === 'Available').length;

  const handleStatusChange = async (id: string, status: HardwareStatus) => {
    try {
      // Moving a unit into service counts as servicing it.
      await hardwareApi.update(id, {
        status,
        ...(status === 'Available' ? { lastServiced: new Date().toISOString().slice(0, 10) } : {}),
      });
      toast.success(`Asset marked as ${status}`);
      reload();
    } catch (err) {
      toastApiError(err);
    }
  };

  const handleDelete = async (item: HardwareItem) => {
    if (!window.confirm(`Delete ${item.name} (${item.serial})?`)) return;
    try {
      await hardwareApi.remove(item.id);
      toast.success(`${item.name} deleted`);
      reload();
    } catch (err) {
      toastApiError(err);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name.trim()) {
      toast.error('Item name is required');
      return;
    }
    try {
      await hardwareApi.create({
        name: newItem.name.trim(),
        type: newItem.type,
        model: newItem.model.trim() || '—',
        serial: newItem.serial.trim() || '—',
        location: newItem.location.trim() || '—',
        condition: newItem.condition,
        purchase_date: new Date().toISOString().slice(0, 10),
        notes: '',
      });
      setNewItem(initialForm);
      setAddOpen(false);
      toast.success(`${newItem.name.trim()} registered`);
      reload();
    } catch (err) {
      toastApiError(err);
    }
  };

  if (loading) {
    return <div className="glass-panel p-10 text-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="p-4 lg:p-6 xl:p-8 max-w-screen-2xl mx-auto space-y-6">
      <Toaster position="bottom-right" theme="system" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Hardware</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {items.length} assets — track consoles, controllers, and equipment
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="btn-primary flex items-center gap-2 h-9 self-start"
        >
          <Plus size={14} />
          Register Item
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-base p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Boxes size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Assets</p>
              <p className="text-lg font-bold text-foreground font-tabular">{total}</p>
            </div>
          </div>
        </div>
        <div className="card-base p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Gamepad2 size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">In Use</p>
              <p className="text-lg font-bold text-primary font-tabular">{inUse}</p>
            </div>
          </div>
        </div>
        <div className="card-base p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning/10 border border-warning/20 flex items-center justify-center">
              <Wrench size={18} className="text-warning" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">In Maintenance</p>
              <p className="text-lg font-bold text-warning font-tabular">{inMaintenance}</p>
            </div>
          </div>
        </div>
        <div className="card-base p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <CheckCircle2 size={18} className="text-accent" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Available</p>
              <p className="text-lg font-bold text-accent font-tabular">{available}</p>
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
            placeholder="Search by name or serial..."
            className="input-field pl-9"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {typeFilters.map((t) => (
            <button
              key={`type-${t}`}
              onClick={() => setTypeFilter(t)}
              className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-colors border ${
                typeFilter === t
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
                  Item
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Type
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Model
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Serial
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Location
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Condition
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Last Serviced
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    <Package size={24} className="mx-auto mb-2 opacity-50" />
                    No assets match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const Icon = typeIcons[item.type];
                  return (
                    <tr
                      key={item.id}
                      className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center">
                            <Icon size={14} className="text-muted-foreground" />
                          </div>
                          <span className="font-semibold text-foreground">{item.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`status-badge ${typeBadgeStyles[item.type]}`}>
                          {item.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{item.model}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                        {item.serial}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{item.location}</td>
                      <td className={`px-4 py-3 font-semibold ${conditionStyles[item.condition]}`}>
                        {item.condition}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={item.status}
                          onChange={(e) =>
                            handleStatusChange(item.id, e.target.value as HardwareStatus)
                          }
                          className={`status-badge cursor-pointer outline-none appearance-none text-center pr-2 ${statusStyles[item.status]}`}
                          title="Edit status"
                        >
                          <option value="In Use">In Use</option>
                          <option value="Available">Available</option>
                          <option value="Maintenance">Maintenance</option>
                          <option value="Retired">Retired</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-tabular text-xs">
                        {item.lastServiced}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-2 rounded-lg text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"
                          title="Delete asset"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Item Modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60" onClick={() => setAddOpen(false)} />
          <div className="relative w-full max-w-md card-base p-6 fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Register Item</h2>
              <button
                onClick={() => setAddOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Item name
                </label>
                <input
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="e.g. DualSense Controller"
                  className="input-field"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Type</label>
                  <select
                    value={newItem.type}
                    onChange={(e) =>
                      setNewItem({ ...newItem, type: e.target.value as HardwareType })
                    }
                    className="input-field"
                  >
                    <option value="Console">Console</option>
                    <option value="Controller">Controller</option>
                    <option value="Headset">Headset</option>
                    <option value="Monitor">Monitor</option>
                    <option value="Cable">Cable</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Condition
                  </label>
                  <select
                    value={newItem.condition}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        condition: e.target.value as HardwareItem['condition'],
                      })
                    }
                    className="input-field"
                  >
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Poor">Poor</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Model
                  </label>
                  <input
                    value={newItem.model}
                    onChange={(e) => setNewItem({ ...newItem, model: e.target.value })}
                    placeholder="e.g. DualSense White"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Serial
                  </label>
                  <input
                    value={newItem.serial}
                    onChange={(e) => setNewItem({ ...newItem, serial: e.target.value })}
                    placeholder="CTR-001"
                    className="input-field"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Location / Room
                </label>
                <input
                  value={newItem.location}
                  onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                  placeholder="e.g. Room 3 or Store"
                  className="input-field"
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
                  <Plus size={14} />
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
