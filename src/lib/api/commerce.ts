'use client';

import type { ExpenseRow, InventoryItemRow, SaleItemRow, SaleRow } from '@/lib/supabase/types';
import {
  expenseSchema,
  inventoryAdjustSchema,
  inventoryItemSchema,
  saleSchema,
} from '@/lib/validation';
import { apiError, deleteRow, fetchAll, hhmm, insertRow, updateRow } from './base';

// ---------------------------------------------------------------------------
// Sales (café POS + session billing history)
// ---------------------------------------------------------------------------
export interface UiSaleItem {
  id: string;
  name: string;
  category: string;
  price: number;
  emoji: string;
  qty: number;
}

export interface UiSale {
  id: string;
  invoiceNumber: string;
  customer: string;
  items: UiSaleItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'Cash' | 'Card' | 'Wallet' | 'Transfer';
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
}

interface JoinedSale extends SaleRow {
  sale_items: SaleItemRow[];
  customers: { name: string } | null;
}

function mapSale(row: JoinedSale): UiSale {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    customer:
      row.customer_id && row.customers?.name ? row.customers.name : row.walk_in_name || 'Walk-in',
    items: (row.sale_items ?? []).map((it) => ({
      id: it.product_id ?? it.id,
      name: it.name,
      category: it.kind === 'session_time' ? 'Playtime' : '',
      price: Number(it.price),
      emoji: it.emoji || '🎮',
      qty: Number(it.qty),
    })),
    subtotal: Number(row.subtotal),
    tax: Number(row.tax),
    total: Number(row.total),
    paymentMethod: row.payment_method,
    date: row.sold_at.slice(0, 10),
    time: hhmm(row.sold_at),
  };
}

export const salesApi = {
  async list(
    opts: { fromDate?: string; limit?: number } = {}
  ): Promise<UiSale[]> {
    const rows = await fetchAll<JoinedSale>('sales', {
      select: '*, sale_items(*), customers(name)',
      order: 'sold_at',
      ascending: false,
      gte: opts.fromDate ? { sold_at: opts.fromDate } : undefined,
      limit: opts.limit,
    });
    return rows.map(mapSale);
  },

  /** Creates a café sale with validated line items. */
  async create(input: unknown): Promise<UiSale> {
    const v = saleSchema.parse(input);
    const supabaseModule = await import('@/lib/supabase/client');
    const client = supabaseModule.getSupabaseBrowserClient();

    const { data: sale, error } = await client
      .from('sales')
      .insert({
        customer_id: v.customer_id ?? null,
        walk_in_name: v.walk_in_name,
        subtotal: v.subtotal,
        tax: v.tax,
        total: v.total,
        payment_method: v.payment_method,
        sold_by: (await client.auth.getUser()).data.user?.id ?? null,
      } as never)
      .select('*, customers(name)')
      .single();
    if (error) throw apiError(error, 'Failed to create sale');

    const createdSale = sale as unknown as JoinedSale;
    const itemRows = v.items.map((item) => ({
      sale_id: createdSale.id,
      product_id: item.product_id ?? null,
      kind: 'product',
      name: item.name,
      price: item.price,
      qty: item.qty,
      emoji: item.emoji,
    }));
    const { error: itemsError } = await client.from('sale_items').insert(itemRows as never);
    if (itemsError) throw apiError(itemsError, 'Sale saved but line items failed');

    return mapSale({ ...createdSale, sale_items: [] });
  },
};

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------
export interface UiExpense {
  id: string;
  title: string;
  category: string;
  amount: number;
  vendor: string;
  date: string; // YYYY-MM-DD
  paymentMethod: 'Cash' | 'Card' | 'Transfer';
  notes: string;
  recurring: boolean;
}

export const expensesApi = {
  async list(): Promise<UiExpense[]> {
    const rows = await fetchAll<ExpenseRow>('expenses', {
      order: 'expense_date',
      ascending: false,
    });
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      category: row.category,
      amount: Number(row.amount),
      vendor: row.vendor,
      date: row.expense_date.slice(0, 10),
      paymentMethod: row.payment_method as UiExpense['paymentMethod'],
      notes: row.notes,
      recurring: row.recurring,
    }));
  },
  async create(input: unknown): Promise<void> {
    const v = expenseSchema.parse(input);
    const supabaseModule = await import('@/lib/supabase/client');
    const client = supabaseModule.getSupabaseBrowserClient();
    const { error } = await client.from('expenses').insert({
      ...v,
      recorded_by: (await client.auth.getUser()).data.user?.id ?? null,
    } as never);
    if (error) throw apiError(error, 'Failed to record expense');
  },
  async remove(id: string): Promise<void> {
    await deleteRow('expenses', id);
  },
};

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------
export interface UiInventoryItem {
  id: string;
  name: string;
  category: string;
  sku: string;
  stock: number;
  reorderLevel: number;
  unitPrice: number;
  supplier: string;
  lastRestocked: string; // display
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
}

export const inventoryApi = {
  async list(): Promise<UiInventoryItem[]> {
    const rows = await fetchAll<InventoryItemRow>('inventory_items', {
      order: 'name',
      ascending: true,
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      sku: row.sku,
      stock: row.stock,
      reorderLevel: row.reorder_level,
      unitPrice: Number(row.unit_price),
      supplier: row.supplier,
      lastRestocked: row.last_restocked?.slice(0, 10) ?? '—',
      status: row.status,
    }));
  },
  async create(input: unknown): Promise<void> {
    const v = inventoryItemSchema.parse(input);
    await insertRow('inventory_items', {
      ...v,
      last_restocked: new Date().toISOString().slice(0, 10),
    });
  },
  /** Stock delta via RPC — recomputes status and writes a movement record. */
  async adjust(itemId: string, delta: number, reason = ''): Promise<void> {
    const parsed = inventoryAdjustSchema.parse({
      p_item_id: itemId,
      p_delta: delta,
      p_reason: reason,
    });
    const supabaseModule = await import('@/lib/supabase/client');
    const client = supabaseModule.getSupabaseBrowserClient();
    const { error } = await (
      client.rpc as unknown as (
        fn: string,
        a: Record<string, unknown>
      ) => Promise<{ data: number | null; error: { message: string } | null }>
    )('adjust_inventory', parsed);
    if (error) throw new Error(error.message);
  },
  async update(id: string, patch: Partial<UiInventoryItem>): Promise<void> {
    const values: Record<string, unknown> = {};
    if (patch.name !== undefined) values.name = patch.name;
    if (patch.category !== undefined) values.category = patch.category;
    if (patch.supplier !== undefined) values.supplier = patch.supplier;
    if (patch.unitPrice !== undefined) values.unit_price = patch.unitPrice;
    if (patch.reorderLevel !== undefined) values.reorder_level = patch.reorderLevel;
    await updateRow('inventory_items', id, values);
  },
};
