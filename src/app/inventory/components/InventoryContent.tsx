'use client';
import React, { useState } from 'react';
import { Package, Plus, Search, Download, AlertTriangle, Boxes, Wallet, X } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { inventoryApi, useAsyncData, toastApiError, type UiInventoryItem } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export type StockStatus = UiInventoryItem['status'];

export type InventoryItem = UiInventoryItem;

const categories = ['All', 'Drinks', 'Snacks', 'Controllers', 'Accessories'];

const statusStyles: Record<StockStatus, string> = {
  'In Stock': 'bg-accent/10 text-accent border border-accent/20',
  'Low Stock': 'bg-warning/10 text-warning border border-warning/20',
  'Out of Stock': 'bg-danger/10 text-danger border border-danger/20',
};

export default function InventoryContent() {
  const { role } = useAuth();
  const isStaff = role === 'staff';
  const { data, loading, reload } = useAsyncData(() => inventoryApi.list(), []);
  const items = data ?? [];
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<StockStatus | 'All'>('All');
  const [addOpen, setAddOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'Drinks',
    sku: '',
    stock: 0,
    unitPrice: 0,
  });

  const filtered = items.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.supplier.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name.trim() || !newItem.sku.trim()) {
      toast.error('Name and SKU are required');
      return;
    }
    const stock = Number(newItem.stock) || 0;
    const reorderLevel = Math.max(5, Math.ceil(stock * 0.35));
    try {
      await inventoryApi.create({
        name: newItem.name.trim(),
        category: newItem.category,
        sku: newItem.sku.trim().toUpperCase(),
        stock,
        reorder_level: reorderLevel,
        unit_price: Number(newItem.unitPrice) || 0,
        supplier: '—',
      });
      setNewItem({ name: '', category: 'Drinks', sku: '', stock: 0, unitPrice: 0 });
      setAddOpen(false);
      toast.success(`${newItem.name.trim()} added to inventory`);
      reload();
    } catch (err) {
      toastApiError(err);
    }
  };

  const handleStatusChange = async (id: string, status: StockStatus) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    // Server-enforced too (adjust_inventory RPC): staff can only INCREASE stock.
    const delta =
      status === 'Out of Stock'
        ? -item.stock
        : status === 'Low Stock'
          ? Math.max(1, item.reorderLevel + 1) - item.stock
          : item.stock <= 0
            ? item.reorderLevel + 1 - item.stock
            : 0;

    if (delta === 0) {
      toast.info(`${item.name} is already at ${status} levels — nothing to adjust`);
      return;
    }
    if (isStaff && delta < 0) {
      toast.error('Staff can only increase stock — ask a manager for decreases');
      return;
    }

    try {
      await inventoryApi.adjust(
        id,
        delta,
        `Marked ${status}${isStaff ? '' : ` (${delta > 0 ? '+' : ''}${delta})`}`
      );
      toast.success(`${item.name} → ${status}`);
      reload();
    } catch (err) {
      toastApiError(err);
    }
  };

  const handleExport = () => {
    const header = 'Name,Category,SKU,Stock,Reorder Level,Unit Price,Supplier,Status';
    // Export respects the active filters, matching what the user sees.
    const rows = filtered.map((i) =>
      [i.name, i.category, i.sku, i.stock, i.reorderLevel, i.unitPrice, i.supplier, i.status]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zoox-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Inventory exported as CSV');
  };

  const lowStockCount = items.filter((i) => i.status === 'Low Stock').length;
  const outCount = items.filter((i) => i.status === 'Out of Stock').length;
  const stockValue = items.reduce((sum, i) => sum + i.stock * i.unitPrice, 0);

  if (loading) {
    return <div className="glass-panel p-10 text-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="p-4 lg:p-6 xl:p-8 max-w-screen-2xl mx-auto">
      <Toaster position="bottom-right" theme="system" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {items.length} products — track stock, prices, and reorders
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="btn-secondary flex items-center gap-2 h-9">
            <Download size={14} />
            Export
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="btn-primary flex items-center gap-2 h-9"
          >
            <Plus size={14} />
            Add Item
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card-base p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Boxes size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Products</p>
              <p className="text-lg font-bold text-foreground font-tabular">{items.length}</p>
            </div>
          </div>
        </div>
        <div className="card-base p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning/10 border border-warning/20 flex items-center justify-center">
              <AlertTriangle size={18} className="text-warning" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Low Stock</p>
              <p className="text-lg font-bold text-warning font-tabular">{lowStockCount}</p>
            </div>
          </div>
        </div>
        <div className="card-base p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-danger/10 border border-danger/20 flex items-center justify-center">
              <X size={18} className="text-danger" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Out of Stock</p>
              <p className="text-lg font-bold text-danger font-tabular">{outCount}</p>
            </div>
          </div>
        </div>
        <div className="card-base p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Wallet size={18} className="text-accent" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Stock Value</p>
              <p className="text-lg font-bold text-foreground font-tabular">
                {stockValue.toLocaleString()} EGP
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, SKU, or supplier..."
            className="input-field pl-9"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-colors border ${
                categoryFilter === c
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              {c}
            </button>
          ))}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StockStatus | 'All')}
            className="input-field !w-auto px-3 py-1.5 text-xs"
          >
            <option value="All">All Statuses</option>
            <option value="In Stock">In Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card-base overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Product
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  SKU
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Category
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Stock
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Unit Price
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Value
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Supplier
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    <Package size={24} className="mx-auto mb-2 opacity-50" />
                    No items match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center">
                          <Package size={14} className="text-muted-foreground" />
                        </div>
                        <span className="font-semibold text-foreground">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                      {item.sku}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.category}</td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`font-semibold font-tabular ${item.stock <= 0 ? 'text-danger' : item.stock <= item.reorderLevel ? 'text-warning' : 'text-foreground'}`}
                      >
                        {item.stock}
                      </span>
                      <span className="text-xs text-muted-foreground"> / {item.reorderLevel}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-tabular text-muted-foreground">
                      {item.unitPrice.toLocaleString()} EGP
                    </td>
                    <td className="px-4 py-3 text-right font-tabular font-semibold text-foreground">
                      {(item.stock * item.unitPrice).toLocaleString()} EGP
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.supplier}</td>
                    <td className="px-4 py-3">
                      <select
                        value={item.status}
                        onChange={(e) => handleStatusChange(item.id, e.target.value as StockStatus)}
                        className={`status-badge cursor-pointer outline-none appearance-none text-center pr-2 ${statusStyles[item.status]}`}
                        title={isStaff ? 'Staff can only increase stock' : 'Edit status'}
                      >
                        <option value="In Stock">In Stock</option>
                        <option value="Low Stock">Low Stock</option>
                        {!isStaff && <option value="Out of Stock">Out of Stock</option>}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Item Modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60" onClick={() => setAddOpen(false)} />
          <div className="relative w-full max-w-md card-base p-6 fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Add Inventory Item</h2>
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
                  Product name
                </label>
                <input
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="e.g. Pepsi 330ml"
                  className="input-field"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">SKU</label>
                  <input
                    value={newItem.sku}
                    onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
                    placeholder="DRK-XXX-000"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Category
                  </label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    className="input-field"
                  >
                    <option value="Drinks">Drinks</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Controllers">Controllers</option>
                    <option value="Accessories">Accessories</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Stock quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newItem.stock}
                    onChange={(e) => setNewItem({ ...newItem, stock: Number(e.target.value) })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Unit price (EGP)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newItem.unitPrice}
                    onChange={(e) => setNewItem({ ...newItem, unitPrice: Number(e.target.value) })}
                    className="input-field"
                  />
                </div>
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
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
