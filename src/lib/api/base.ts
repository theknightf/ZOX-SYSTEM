'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

type TableName = keyof Database['public']['Tables'];

export function apiError(err: unknown, fallback = 'Something went wrong'): Error {
  if (err instanceof Error && err.message) return new Error(err.message);
  if (
    err &&
    typeof err === 'object' &&
    'message' in err &&
    typeof (err as { message?: unknown }).message === 'string'
  ) {
    return new Error((err as { message: string }).message);
  }
  return new Error(fallback);
}

export function toastApiError(err: unknown, fallback?: string): void {
  toast.error(apiError(err, fallback).message);
}

export async function fetchAll<TRow>(
  table: TableName,
  opts: {
    select?: string;
    order?: string;
    ascending?: boolean;
    eq?: Record<string, unknown>;
    inFilter?: { column: string; values: unknown[] };
    /** Raw PostgREST `or` expression, e.g. "customer_id.eq.x,phone.eq.y". */
    or?: string;
    gte?: Record<string, unknown>;
    limit?: number;
  } = {}
): Promise<TRow[]> {
  const supabase = getSupabaseBrowserClient();
  // table is a runtime string; the builder chain is trusted because every
  // write path is Zod-validated upstream and selects are read-only.
  const builder = supabase.from(table) as any;
  let query = builder.select(opts.select ?? '*');
  for (const [column, value] of Object.entries(opts.eq ?? {})) {
    query = query.eq(column, value);
  }
  if (opts.inFilter) query = query.in(opts.inFilter.column, opts.inFilter.values);
  if (opts.or) query = query.or(opts.or);
  if (opts.gte) {
    for (const [column, value] of Object.entries(opts.gte)) {
      query = query.gte(column, value);
    }
  }
  if (opts.order) query = query.order(opts.order, { ascending: opts.ascending ?? false });
  if (opts.limit != null) query = query.limit(opts.limit);
  const { data, error } = await query;
  if (error) throw apiError(error, `Failed to load ${table}`);
  return (data ?? []) as TRow[];
}

export async function insertRow<TRow>(
  table: TableName,
  values: Record<string, unknown>
): Promise<TRow> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from(table)
    .insert(values as never)
    .select()
    .single();
  if (error) throw apiError(error, `Failed to create ${table.replace(/_/g, ' ')}`);
  return data as TRow;
}

export async function updateRow(
  table: TableName,
  id: string,
  values: Record<string, unknown>
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from(table)
    .update(values as never)
    .eq('id', id);
  if (error) throw apiError(error, `Failed to update ${table.replace(/_/g, ' ')}`);
}

export async function deleteRow(table: TableName, id: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw apiError(error, `Failed to delete ${table.replace(/_/g, ' ')}`);
}

export function enGBDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function enGBDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = value.length <= 10 ? new Date(`${value}T00:00:00`) : new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB');
}

export function hhmm(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export interface AsyncData<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

export function useAsyncData<T>(loader: () => Promise<T>, deps: unknown[] = []): AsyncData<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const run = useCallback(async () => {
    try {
      setError(null);
      const result = await loaderRef.current();
      setData(result);
    } catch (err) {
      const e = apiError(err);
      setError(e.message);
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, reload: run, setData };
}
