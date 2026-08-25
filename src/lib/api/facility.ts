'use client';

import type { HardwareRow, LostFoundRow, MaintenanceTaskRow } from '@/lib/supabase/types';
import { hardwareSchema, lostFoundSchema, maintenanceSchema } from '@/lib/validation';
import { deleteRow, enGBDateTime, fetchAll, hhmm, insertRow, updateRow } from './base';

// ---------------------------------------------------------------------------
// Maintenance
// ---------------------------------------------------------------------------
export interface UiMaintenanceTask {
  id: string;
  title: string;
  location: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Open' | 'In Progress' | 'Done' | 'Cancelled';
  assignedTo: string; // name
  reportedBy: string; // name
  reportedAt: string; // en-GB display
  description: string;
  completedAt?: string; // en-GB display
}

interface JoinedTask extends MaintenanceTaskRow {
  assigned: { name: string } | null;
  reporter: { name: string } | null;
}

export const maintenanceApi = {
  async list(): Promise<UiMaintenanceTask[]> {
    const rows = await fetchAll<JoinedTask>('maintenance_tasks', {
      select:
        '*, assigned:staff!maintenance_tasks_assigned_to_fkey(name), reporter:staff!maintenance_tasks_reported_by_fkey(name)',
      order: 'reported_at',
      ascending: false,
    });
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      location: row.location,
      priority: row.priority,
      status: row.status,
      assignedTo: row.assigned?.name ?? 'Unassigned',
      reportedBy: row.reporter?.name ?? '—',
      reportedAt: enGBDateTime(row.reported_at),
      description: row.description,
      completedAt: row.completed_at ? enGBDateTime(row.completed_at) : undefined,
    }));
  },
  async create(input: unknown): Promise<void> {
    const v = maintenanceSchema.parse(input);
    await insertRow('maintenance_tasks', v);
  },
  async update(id: string, patch: Partial<UiMaintenanceTask>): Promise<void> {
    const values: Record<string, unknown> = { status: patch.status ?? undefined };
    if (patch.title !== undefined) values.title = patch.title;
    if (patch.location !== undefined) values.location = patch.location;
    if (patch.priority !== undefined) values.priority = patch.priority;
    if (patch.description !== undefined) values.description = patch.description;
    if (patch.assignedTo !== undefined) values.assigned_to = patch.assignedTo;
    if (patch.status === 'Done') values.completed_at = new Date().toISOString();
    // Reopening/cancelling clears the stale completion stamp.
    if (patch.status && patch.status !== 'Done') values.completed_at = null;
    await updateRow('maintenance_tasks', id, values);
  },
};

// ---------------------------------------------------------------------------
// Hardware
// ---------------------------------------------------------------------------
export interface UiHardwareItem {
  id: string;
  name: string;
  type: 'Console' | 'Controller' | 'Headset' | 'Monitor' | 'Cable';
  model: string;
  serial: string;
  location: string;
  status: 'In Use' | 'Available' | 'Maintenance' | 'Retired';
  condition: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  purchaseDate: string;
  lastServiced: string;
  notes: string;
}

interface JoinedHardware extends HardwareRow {
  rooms: { name: string } | null;
}

export const hardwareApi = {
  async list(): Promise<UiHardwareItem[]> {
    const rows = await fetchAll<JoinedHardware>('hardware', {
      select: '*, rooms(name)',
      order: 'name',
      ascending: true,
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      model: row.model,
      serial: row.serial,
      location: row.rooms?.name ?? row.location,
      status: row.status,
      condition: row.condition,
      purchaseDate: row.purchase_date?.slice(0, 10) ?? '—',
      lastServiced: row.last_serviced ?? '—',
      notes: row.notes,
    }));
  },
  async create(input: unknown): Promise<void> {
    const v = hardwareSchema.parse(input);
    await insertRow('hardware', v);
  },
  async update(id: string, patch: Partial<UiHardwareItem>): Promise<void> {
    const values: Record<string, unknown> = {};
    for (const key of [
      'name',
      'type',
      'model',
      'serial',
      'status',
      'condition',
      'notes',
      'purchaseDate',
      'lastServiced',
    ] as const) {
      if (patch[key] === undefined) continue;
      const dbKey =
        key === 'purchaseDate' ? 'purchase_date' : key === 'lastServiced' ? 'last_serviced' : key;
      values[dbKey] = patch[key];
    }
    await updateRow('hardware', id, values);
  },
  async remove(id: string): Promise<void> {
    await deleteRow('hardware', id);
  },
};

// ---------------------------------------------------------------------------
// Lost & found
// ---------------------------------------------------------------------------
export interface UiLostFoundItem {
  id: string;
  description: string;
  category: 'Phone' | 'Wallet' | 'Accessory' | 'Clothing' | 'Other';
  foundLocation: string;
  foundBy: string;
  foundAt: string; // YYYY-MM-DD HH:mm
  status: 'Unclaimed' | 'Returned' | 'Disposed';
  claimedBy: string;
  claimedAt: string | null;
  notes: string;
}

export const lostFoundApi = {
  async list(): Promise<UiLostFoundItem[]> {
    const rows = await fetchAll<LostFoundRow>('lost_found', {
      order: 'found_at',
      ascending: false,
    });
    return rows.map((row) => ({
      id: row.id,
      description: row.description,
      category: row.category,
      foundLocation: row.found_location,
      foundBy: row.found_by,
      foundAt: row.found_at.replace('T', ' ').slice(0, 16),
      status: row.status,
      claimedBy: row.claimed_by,
      claimedAt: row.claimed_at ? hhmm(row.claimed_at) : null,
      notes: row.notes,
    }));
  },
  async create(input: unknown): Promise<void> {
    const v = lostFoundSchema.parse(input);
    await insertRow('lost_found', v);
  },
  async claim(id: string, claimedBy: string): Promise<void> {
    await updateRow('lost_found', id, {
      status: 'Returned',
      claimed_by: claimedBy,
      claimed_at: new Date().toISOString(),
    });
  },
  async update(id: string, patch: Partial<UiLostFoundItem>): Promise<void> {
    const values: Record<string, unknown> = {};
    if (patch.status !== undefined) values.status = patch.status;
    if (patch.notes !== undefined) values.notes = patch.notes;
    if (patch.claimedBy !== undefined) values.claimed_by = patch.claimedBy;
    await updateRow('lost_found', id, values);
  },
};
