'use client';

import type {
  CatalogProductRow,
  ReservationRow,
  RoomRow,
  WaitingListRow,
} from '@/lib/supabase/types';
import { roomSchema, reservationSchema, waitingSchema } from '@/lib/validation';
import { deleteRow, enGBDateTime, fetchAll, hhmm, insertRow, updateRow } from './base';

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------
export interface UiRoom {
  id: string;
  name: string;
  roomType: 'Standard' | 'Premium' | 'VIP';
  status: 'Available' | 'Occupied' | 'Reserved' | 'Maintenance';
  capacity: number;
  controllers: number;
  hourlyRate: number;
  psModel: string;
  category: 'playstation' | 'billiards' | 'cafe';
}

function mapRoom(row: RoomRow): UiRoom {
  return {
    id: row.id,
    name: row.name,
    roomType: row.room_type,
    status: row.status,
    capacity: row.capacity,
    controllers: row.controllers,
    hourlyRate: Number(row.hourly_rate),
    psModel: row.ps_model,
    category: row.category ?? 'playstation',
  };
}

export const roomsApi = {
  async list(): Promise<UiRoom[]> {
    const rows = await fetchAll<RoomRow>('rooms', { order: 'name', ascending: true });
    return rows.map(mapRoom);
  },
  async create(input: unknown): Promise<void> {
    const v = roomSchema.parse(input);
    await insertRow('rooms', v);
  },
  async update(id: string, patch: Partial<UiRoom>): Promise<void> {
    const values: Record<string, unknown> = {};
    if (patch.name !== undefined) values.name = patch.name;
    if (patch.roomType !== undefined) values.room_type = patch.roomType;
    if (patch.status !== undefined) values.status = patch.status;
    if (patch.capacity !== undefined) values.capacity = patch.capacity;
    if (patch.controllers !== undefined) values.controllers = patch.controllers;
    if (patch.hourlyRate !== undefined) values.hourly_rate = patch.hourlyRate;
    if (patch.psModel !== undefined) values.ps_model = patch.psModel;
    await updateRow('rooms', id, values);
  },
  async remove(id: string): Promise<void> {
    await deleteRow('rooms', id);
  },
};

// ---------------------------------------------------------------------------
// Catalog products (café POS)
// ---------------------------------------------------------------------------
export interface UiCatalogProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  emoji: string;
}

export const catalogApi = {
  async list(): Promise<UiCatalogProduct[]> {
    const rows = await fetchAll<CatalogProductRow>('catalog_products', {
      order: 'category',
      ascending: true,
      eq: { active: true },
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      price: Number(r.price),
      emoji: r.emoji,
    }));
  },
};

// ---------------------------------------------------------------------------
// Reservations
// ---------------------------------------------------------------------------
export type UiReservationStatus =
  'Reserved' | 'Arrived' | 'Active' | 'Completed' | 'Cancelled' | 'No Show' | 'Waiting' | 'Late';

export interface UiReservation {
  id: string;
  customerId: string | null;
  customer: string;
  phone: string;
  roomId: string | null;
  room: string;
  roomType: 'Standard' | 'Premium' | 'VIP';
  category?: 'playstation' | 'billiards' | 'cafe';
  game: string;
  players: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  duration: string | null; // minutes as string, matching legacy UI
  status: UiReservationStatus;
  sessionType: 'open' | 'fixed';
  notes?: string;
  createdBy: 'staff' | 'customer';
}

interface JoinedReservation extends ReservationRow {
  rooms: { name: string; room_type: RoomRow['room_type'] } | null;
  customers: { name: string } | null;
}

function mapReservation(row: JoinedReservation): UiReservation {
  return {
    id: row.id,
    customerId: row.customer_id,
    customer: row.customers?.name || row.guest_name || 'Guest',
    phone: row.phone,
    roomId: row.room_id,
    room: row.rooms?.name ?? 'Unassigned',
    roomType: row.rooms?.room_type ?? 'Standard',
    category: row.category,
    game: row.game,
    players: row.players,
    date: row.res_date,
    time: hhmm(`${row.res_date}T${row.res_time}`),
    duration: row.duration_minutes != null ? String(row.duration_minutes) : null,
    status: row.status,
    sessionType: row.session_kind,
    notes: row.notes ?? undefined,
    createdBy: row.created_by_role === 'customer' ? 'customer' : 'staff',
  };
}

export const reservationsApi = {
  async list(
    opts: { fromDate?: string; limit?: number } = {}
  ): Promise<UiReservation[]> {
    const rows = await fetchAll<JoinedReservation>('reservations', {
      select: '*, rooms(name, room_type), customers(name)',
      order: 'res_date',
      ascending: false,
      gte: opts.fromDate ? { res_date: opts.fromDate } : undefined,
      limit: opts.limit,
    });
    return rows.map(mapReservation);
  },
  /** Lightest possible query for the sidebar "next arrival" widget. */
  async nextArrivalToday(): Promise<UiReservation | null> {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const rows = await fetchAll<JoinedReservation>('reservations', {
      select: '*, rooms(name, room_type), customers(name)',
      eq: { res_date: today },
      inFilter: { column: 'status', values: ['Reserved', 'Waiting', 'Late'] },
      order: 'res_time',
      ascending: true,
      limit: 1,
    });
    return rows[0] ? mapReservation(rows[0]) : null;
  },
  async create(input: unknown): Promise<UiReservation> {
    const v = reservationSchema.parse(input);
    const row = await insertRow<JoinedReservation>('reservations', {
      ...v,
      guest_name: v.guest_name || v.customer_id || '',
    });
    return mapReservation(row);
  },
  async update(id: string, patch: Partial<UiReservation>): Promise<void> {
    const values: Record<string, unknown> = {};
    if (patch.status !== undefined) values.status = patch.status;
    if (patch.notes !== undefined) values.notes = patch.notes;
    if (patch.game !== undefined) values.game = patch.game;
    if (patch.players !== undefined) values.players = patch.players;
    if (patch.date !== undefined) values.res_date = patch.date;
    if (patch.time !== undefined) values.res_time = `${patch.time}:00`;
    if (patch.duration !== undefined)
      values.duration_minutes = patch.duration == null ? null : Number(patch.duration);
    if (patch.sessionType !== undefined) values.session_kind = patch.sessionType;
    if (patch.roomId !== undefined) values.room_id = patch.roomId;
    if (patch.customerId !== undefined) values.customer_id = patch.customerId;
    await updateRow('reservations', id, values);
  },
  async remove(id: string): Promise<void> {
    await deleteRow('reservations', id);
  },
};

// ---------------------------------------------------------------------------
// Waiting list
// ---------------------------------------------------------------------------
export interface UiWaitingEntry {
  id: string;
  name: string;
  partySize: number;
  roomPreference: 'Standard' | 'Premium' | 'VIP' | 'Any';
  game?: string;
  phone?: string;
  customerId?: string | null;
  joinedAt: string; // en-GB display
  status: 'Waiting' | 'Notified' | 'Seated' | 'Cancelled';
  notifiedAt?: string;
  seatedRoom?: string;
  notes?: string;
}

interface JoinedWaiting extends WaitingListRow {
  rooms: { name: string } | null;
}

function mapWaiting(row: JoinedWaiting): UiWaitingEntry {
  return {
    id: row.id,
    name: row.name,
    partySize: row.party_size,
    roomPreference: row.room_preference,
    game: row.game ?? undefined,
    phone: row.phone ?? undefined,
    customerId: row.customer_id ?? null,
    joinedAt: enGBDateTime(row.joined_at),
    status: row.status,
    notifiedAt: row.notified_at ? hhmm(row.notified_at) : undefined,
    seatedRoom: row.rooms?.name ?? undefined,
    notes: row.notes ?? undefined,
  };
}

export const waitingApi = {
  async list(): Promise<UiWaitingEntry[]> {
    const rows = await fetchAll<JoinedWaiting>('waiting_list', {
      select: '*, rooms(name)',
      order: 'joined_at',
      ascending: true,
    });
    return rows.map(mapWaiting);
  },
  async create(input: unknown): Promise<void> {
    const v = waitingSchema.parse(input);
    await insertRow('waiting_list', v);
  },
  async notify(id: string): Promise<void> {
    await updateRow('waiting_list', id, {
      status: 'Notified',
      notified_at: new Date().toISOString(),
    });
  },
  async seat(id: string, roomId: string | null): Promise<void> {
    await updateRow('waiting_list', id, { status: 'Seated', seated_room_id: roomId });
  },
  async cancel(id: string): Promise<void> {
    await updateRow('waiting_list', id, { status: 'Cancelled' });
  },
  async update(id: string, patch: Partial<UiWaitingEntry>): Promise<void> {
    const values: Record<string, unknown> = {};
    if (patch.notes !== undefined) values.notes = patch.notes;
    if (patch.game !== undefined) values.game = patch.game;
    if (patch.phone !== undefined) values.phone = patch.phone;
    if (patch.partySize !== undefined) values.party_size = patch.partySize;
    await updateRow('waiting_list', id, values);
  },
};
