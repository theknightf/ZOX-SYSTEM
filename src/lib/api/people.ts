'use client';

import type {
  CustomerRow,
  FeedbackRow,
  LoyaltyTransactionRow,
  RewardRow,
  StaffRow,
} from '@/lib/supabase/types';
import { customerSchema, feedbackSchema, staffSchema } from '@/lib/validation';
import { deleteRow, enGBDate, fetchAll, hhmm, insertRow, updateRow } from './base';

// ---------------------------------------------------------------------------
// Customers (also the loyalty member store)
// ---------------------------------------------------------------------------
export type LoyaltyTier = 'Bronze' | 'Silver' | 'Gold' | 'VIP';

export function tierForPoints(points: number): LoyaltyTier {
  if (points >= 5000) return 'VIP';
  if (points >= 2000) return 'Gold';
  if (points >= 800) return 'Silver';
  return 'Bronze';
}

export interface UiCustomer {
  id: string;
  name: string;
  phone: string;
  email: string;
  visits: number;
  totalSpent: number;
  loyaltyPoints: number;
  tier: LoyaltyTier;
  lastVisit: string; // display date or '—'
  notes: string;
}

function mapCustomer(row: CustomerRow): UiCustomer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    visits: row.visits,
    totalSpent: Number(row.total_spent),
    loyaltyPoints: row.loyalty_points,
    tier: row.tier,
    lastVisit: enGBDate(row.last_visit),
    notes: row.notes,
  };
}

export const customersApi = {
  async list(): Promise<UiCustomer[]> {
    const rows = await fetchAll<CustomerRow>('customers', { order: 'name', ascending: true });
    return rows.map(mapCustomer);
  },
  /** Exact-phone lookup. Uses the find_customer_by_phone RPC when present,
   *  falling back to a direct filtered query (pre-migration databases). */
  async getByPhone(phone: string): Promise<UiCustomer | null> {
    const clean = phone.trim();
    if (!clean) return null;
    const { getSupabaseBrowserClient } = await import('@/lib/supabase/client');
    const client = getSupabaseBrowserClient();
    const { data: rpcRows, error } = await (
      client.rpc as unknown as (
        fn: string,
        a: Record<string, unknown>
      ) => Promise<{ data: Array<Record<string, unknown>> | null; error: { message: string } | null }>
    )('find_customer_by_phone', { p_phone: clean });
    if (!error && rpcRows && rpcRows.length > 0) {
      const c = rpcRows[0];
      return {
        id: String(c.id),
        name: String(c.name),
        phone: String(c.phone ?? ''),
        email: String(c.email ?? ''),
        visits: Number(c.visits ?? 0),
        totalSpent: Number(c.total_spent ?? 0),
        loyaltyPoints: Number(c.loyalty_points ?? 0),
        tier: (c.tier as UiCustomer['tier']) ?? 'Bronze',
        lastVisit: '—',
        notes: '',
      };
    }
    const rows = await fetchAll<CustomerRow>('customers', { eq: { phone: clean }, limit: 2 });
    if (rows.length === 0) return null;
    return mapCustomer(rows[0]);
  },
  /** Creates the customer unless one with the same phone already exists
   *  (guards against double-submit / race duplicates). Returns the id. */
  async createIfAbsent(input: {
    name: string;
    phone: string;
    email?: string;
    notes?: string;
  }): Promise<{ id: string; created: boolean }> {
    const cleanPhone = input.phone.trim();
    if (cleanPhone) {
      const existing = await customersApi.getByPhone(cleanPhone);
      if (existing) return { id: existing.id, created: false };
    }
    const v = customerSchema.parse({
      name: input.name,
      phone: cleanPhone || '—',
      email: input.email?.trim() || '—',
      notes: input.notes ?? '',
    });
    const row = await insertRow<CustomerRow>('customers', v);
    return { id: row.id, created: true };
  },
  async create(input: unknown): Promise<void> {
    const v = customerSchema.parse(input);
    await insertRow('customers', v);
  },
  async update(id: string, patch: Partial<UiCustomer>): Promise<void> {
    const values: Record<string, unknown> = {};
    if (patch.name !== undefined) values.name = patch.name;
    if (patch.phone !== undefined) values.phone = patch.phone;
    if (patch.email !== undefined) values.email = patch.email;
    if (patch.notes !== undefined) values.notes = patch.notes;
    if (patch.loyaltyPoints !== undefined) {
      values.loyalty_points = patch.loyaltyPoints;
      values.tier = tierForPoints(patch.loyaltyPoints);
    }
    await updateRow('customers', id, values);
  },
  async remove(id: string): Promise<void> {
    await deleteRow('customers', id);
  },
  /** Server-side points adjustment with transaction + tier recompute. */
  async adjustPoints(customerId: string, delta: number, reason = ''): Promise<void> {
    const supabaseModule = await import('@/lib/supabase/client');
    const client = supabaseModule.getSupabaseBrowserClient();
    const { error } = await (
      client.rpc as unknown as (
        fn: string,
        a: Record<string, unknown>
      ) => Promise<{ data: number | null; error: { message: string } | null }>
    )('adjust_loyalty_points', { p_customer_id: customerId, p_delta: delta, p_reason: reason });
    if (error) throw new Error(error.message);
  },
};

/** Loyalty members view over the customers table. */
export interface UiLoyaltyMember {
  id: string;
  name: string;
  phone: string;
  points: number;
  tier: LoyaltyTier;
  visits: number;
  joinDate: string;
  lastActivity: string;
  status: 'Active' | 'Inactive';
}

export const loyaltyApi = {
  async listMembers(): Promise<UiLoyaltyMember[]> {
    const customers = await customersApi.list();
    return customers.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      points: c.loyaltyPoints,
      tier: c.tier,
      visits: c.visits,
      joinDate: '—',
      lastActivity: c.lastVisit,
      status: c.visits > 0 ? ('Active' as const) : ('Inactive' as const),
    }));
  },
  async adjustPoints(memberId: string, delta: number): Promise<void> {
    await customersApi.adjustPoints(memberId, delta, 'Manual loyalty adjustment');
  },
};

export interface UiReward {
  id: string;
  name: string;
  description: string;
  cost: number;
  emoji: string;
  enabled: boolean;
}

export const rewardsApi = {
  async list(): Promise<UiReward[]> {
    const rows = await fetchAll<RewardRow>('rewards', { order: 'cost', ascending: true });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      cost: r.cost,
      emoji: r.emoji,
      enabled: r.enabled,
    }));
  },
  async create(input: Omit<UiReward, 'id'>): Promise<void> {
    await insertRow('rewards', input);
  },
  async update(id: string, patch: Partial<UiReward>): Promise<void> {
    await updateRow('rewards', id, patch);
  },
  async history(customerId: string) {
    return fetchAll<LoyaltyTransactionRow>('loyalty_transactions', {
      order: 'created_at',
      ascending: false,
      eq: { customer_id: customerId },
      limit: 50,
    });
  },
};

// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------
export interface UiStaffMember {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  shift: 'Morning' | 'Midday' | 'Evening' | 'Night';
  status: 'Active' | 'On Leave' | 'Terminated';
  hourlyRate: number;
  hireDate: string; // display
  emergencyContact: string;
}

function mapStaff(row: StaffRow): UiStaffMember {
  return {
    id: row.id,
    name: row.name,
    role: row.role === 'Cafe Cashier' ? 'Café Cashier' : row.role,
    email: row.email,
    phone: row.phone,
    shift: row.shift,
    status: row.status,
    hourlyRate: Number(row.hourly_rate),
    hireDate: enGBDate(row.hire_date),
    emergencyContact: row.emergency_contact,
  };
}

export const staffApi = {
  async list(): Promise<UiStaffMember[]> {
    const rows = await fetchAll<StaffRow>('staff', { order: 'name', ascending: true });
    return rows.map(mapStaff);
  },
  async create(input: unknown): Promise<void> {
    const v = staffSchema.parse(input);
    await insertRow('staff', v);
  },
  async update(id: string, patch: Partial<UiStaffMember>): Promise<void> {
    const values: Record<string, unknown> = {};
    for (const key of ['name', 'email', 'phone', 'shift', 'status', 'emergencyContact'] as const) {
      if (patch[key] !== undefined)
        values[key === 'emergencyContact' ? 'emergency_contact' : key] = patch[key];
    }
    if (patch.role !== undefined) {
      values.role = patch.role === 'Café Cashier' ? 'Cafe Cashier' : patch.role;
    }
    if (patch.hourlyRate !== undefined) values.hourly_rate = patch.hourlyRate;
    await updateRow('staff', id, values);
  },
  async remove(id: string): Promise<void> {
    await deleteRow('staff', id);
  },
};

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------
export type AttendanceState = 'On Time' | 'Late' | 'Absent' | 'Off Duty';

export interface UiAttendanceShift {
  staffId: string;
  name: string;
  role: string;
  shiftLabel: string;
  shiftStart: string;
  shiftEnd: string;
  status: AttendanceState;
  location: string;
  checkIn: string | null;
  minutesLate: number;
}

const SHIFT_TIMES: Record<string, [string, string]> = {
  Morning: ['09:00', '17:00'],
  Midday: ['12:00', '20:00'],
  Evening: ['16:00', '00:00'],
  Night: ['20:00', '04:00'],
};

export const attendanceApi = {
  /** Today's roster derived from active staff + their shift schedule. */
  async todayRoster(): Promise<UiAttendanceShift[]> {
    const [{ data, error }, staff] = await Promise.all([
      (await import('@/lib/supabase/client'))
        .getSupabaseBrowserClient()
        .from('attendance')
        .select('*')
        .eq('work_date', new Date().toISOString().slice(0, 10)),
      staffApi.list(),
    ]);
    if (error) throw new Error(error.message);

    const records = (data ?? []) as Array<{
      staff_id: string;
      status: AttendanceState;
      location: string;
      check_in_at: string | null;
      minutes_late: number;
      shift_label: string | null;
      shift_start: string | null;
      shift_end: string | null;
    }>;

    return staff
      .filter((s) => s.status === 'Active')
      .map((s) => {
        const rec = records.find(
          (r) => r.staff_id === s.id && (!r.shift_label || r.shift_label === s.shift)
        );
        const [start, end] =
          rec?.shift_start && rec?.shift_end
            ? [rec.shift_start.slice(0, 5), rec.shift_end.slice(0, 5)]
            : (SHIFT_TIMES[s.shift] ?? ['', '']);
        return {
          staffId: s.id,
          name: s.name,
          role: s.role,
          shiftLabel: s.shift,
          shiftStart: start,
          shiftEnd: end,
          status: rec ? rec.status : ('Off Duty' as AttendanceState),
          location: rec?.location || '',
          checkIn: rec?.check_in_at ? hhmm(rec.check_in_at) : null,
          minutesLate: rec?.minutes_late ?? 0,
        };
      });
  },

  async checkIn(staffId: string): Promise<AttendanceState> {
    const supabaseModule = await import('@/lib/supabase/client');
    const client = supabaseModule.getSupabaseBrowserClient();
    const { data, error } = await (
      client.rpc as unknown as (
        fn: string,
        a: Record<string, unknown>
      ) => Promise<{ data: string | null; error: { message: string } | null }>
    )('check_in', { p_staff_id: staffId });
    if (error) throw new Error(error.message);
    return (data ?? 'On Time') as AttendanceState;
  },
};

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------
export interface UiFeedbackEntry {
  id: string;
  customer: string;
  game: string;
  room: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  rating: number;
  tags: string[];
  notes: string;
  submittedAt: string; // ISO
  status: 'new' | 'reviewed';
}

interface JoinedFeedback extends FeedbackRow {
  rooms: { name: string } | null;
}

export const feedbackApi = {
  async list(opts: { limit?: number } = {}): Promise<UiFeedbackEntry[]> {
    const rows = await fetchAll<JoinedFeedback>('feedback', {
      select: '*, rooms(name)',
      order: 'submitted_at',
      ascending: false,
      limit: opts.limit,
    });
    return rows.map((row) => ({
      id: row.id,
      customer: row.author_name || 'Guest',
      game: row.game,
      room: row.rooms?.name ?? '',
      date: row.submitted_at.slice(0, 10),
      time: hhmm(row.submitted_at),
      rating: row.rating,
      tags: row.tags,
      notes: row.notes,
      submittedAt: row.submitted_at,
      status: row.status,
    }));
  },
  /** Called after a session ends (EvaluationPopup). */
  async submit(input: {
    sessionId?: string | null;
    customerId?: string | null;
    roomId?: string | null;
    authorName: string;
    game: string;
    rating: number;
    tags?: string[];
    notes?: string;
  }): Promise<void> {
    const parsed = feedbackSchema.parse({
      rating: input.rating,
      tags: input.tags ?? [],
      notes: input.notes ?? '',
    });
    await insertRow('feedback', {
      session_id: input.sessionId ?? null,
      customer_id: input.customerId ?? null,
      room_id: input.roomId ?? null,
      author_name: input.authorName,
      game: input.game,
      ...parsed,
    });
  },
  async setStatus(id: string, status: 'new' | 'reviewed'): Promise<void> {
    await updateRow('feedback', id, { status });
  },
};
