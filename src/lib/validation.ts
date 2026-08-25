import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------
export const uuid = z.string().uuid('Invalid id');
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const timeString = z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:mm');
const positiveInt = z.coerce.number().int().positive();
const nonNegative = z.coerce.number().min(0);
const money = z.coerce.number().min(0).max(10_000_000);

export const roomTypeEnum = z.enum(['Standard', 'Premium', 'VIP']);
export const roomStatusEnum = z.enum(['Available', 'Occupied', 'Reserved', 'Maintenance']);
export const sessionKindEnum = z.enum(['open', 'fixed']);
export const paymentMethodEnum = z.enum(['Cash', 'Card', 'Wallet', 'Transfer']);

// ---------------------------------------------------------------------------
// Auth / profile
// ---------------------------------------------------------------------------
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
export const registerSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().email(),
  phone: z
    .string()
    .regex(/^01[0-9]{9}$/)
    .optional()
    .or(z.literal('')),
  password: z.string().min(8, 'Minimum 8 characters'),
});

// ---------------------------------------------------------------------------
// Rooms & reservations
// ---------------------------------------------------------------------------
export const roomSchema = z.object({
  name: z.string().trim().min(1).max(80),
  room_type: roomTypeEnum,
  capacity: positiveInt.max(100),
  controllers: nonNegative.int().max(50),
  hourly_rate: money,
  ps_model: z.string().trim().max(40),
});

export const reservationSchema = z.object({
  customer_id: uuid.nullish(),
  guest_name: z.string().trim().max(120).default(''),
  phone: z.string().trim().max(30).default(''),
  room_id: uuid.nullish(),
  category: z.enum(['playstation', 'billiards', 'cafe']).default('playstation'),
  game: z.string().trim().max(80).default(''),
  players: positiveInt.max(20),
  res_date: dateString,
  res_time: timeString,
  duration_minutes: positiveInt.max(24 * 60).nullish(),
  session_kind: sessionKindEnum.default('open'),
  notes: z.string().trim().max(500).nullish(),
  created_by_role: z.enum(['staff', 'customer']).default('staff'),
});

// ---------------------------------------------------------------------------
// Customers & loyalty
// ---------------------------------------------------------------------------
export const customerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30).default(''),
  email: z.string().trim().email().or(z.literal('')).default(''),
  notes: z.string().trim().max(500).default(''),
});

export const loyaltyAdjustSchema = z.object({
  customer_id: uuid,
  delta: z.coerce.number().int(),
  reason: z.string().trim().max(200).default(''),
});

// ---------------------------------------------------------------------------
// Live sessions (writes go through RPCs)
// ---------------------------------------------------------------------------
export const startSessionSchema = z.object({
  p_room_id: uuid,
  p_guest_name: z.string().trim().max(120).default(''),
  p_phone: z.string().trim().max(30).default(''),
  p_game: z.string().trim().max(80).default(''),
  p_players: positiveInt.max(20).default(1),
  p_session_kind: sessionKindEnum.default('open'),
  p_fixed_duration_minutes: positiveInt.max(24 * 60).nullish(),
  p_customer_id: uuid.nullish(),
  p_reservation_id: uuid.nullish(),
});

export const endSessionSchema = z.object({
  p_session_id: uuid,
  p_payment_method: paymentMethodEnum.default('Cash'),
});

export const extendSessionSchema = z.object({
  p_session_id: uuid,
  p_minutes: positiveInt.max(24 * 60),
});

export const addSessionProductSchema = z.object({
  p_session_id: uuid,
  p_product_id: uuid.nullish(),
  p_name: z.string().trim().min(1).max(120),
  p_price: money,
  p_qty: positiveInt.max(99).default(1),
});

// ---------------------------------------------------------------------------
// Sales / expenses
// ---------------------------------------------------------------------------
export const saleItemSchema = z.object({
  product_id: uuid.nullish(),
  name: z.string().trim().min(1).max(120),
  price: money,
  qty: z.coerce.number().positive().max(999).default(1),
  emoji: z.string().max(8).default(''),
});

export const saleSchema = z
  .object({
    customer_id: uuid.nullish(),
    walk_in_name: z.string().trim().max(120).default('Walk-in'),
    items: z.array(saleItemSchema).min(1, 'Add at least one item'),
    payment_method: paymentMethodEnum.default('Cash'),
    subtotal: money,
    tax: money.default(0),
    total: money,
  })
  .refine((s) => Math.abs(s.subtotal + s.tax - s.total) < 0.01, {
    message: 'Total must equal subtotal + tax',
    path: ['total'],
  });

export const expenseSchema = z.object({
  title: z.string().trim().min(2).max(160),
  category: z.string().trim().min(1).max(60),
  amount: money,
  vendor: z.string().trim().max(120).default(''),
  expense_date: dateString,
  payment_method: paymentMethodEnum.default('Cash'),
  notes: z.string().trim().max(500).default(''),
  recurring: z.boolean().default(false),
});

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------
export const inventoryItemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(60),
  sku: z.string().trim().min(1).max(60),
  stock: nonNegative.int(),
  reorder_level: nonNegative.int(),
  unit_price: money,
  supplier: z.string().trim().max(120).default(''),
});

export const inventoryAdjustSchema = z.object({
  p_item_id: uuid,
  p_delta: z.coerce.number().int(),
  p_reason: z.string().trim().max(200).default(''),
});

// ---------------------------------------------------------------------------
// Staff / attendance / maintenance / lost&found / feedback / waiting
// ---------------------------------------------------------------------------
export const staffSchema = z.object({
  name: z.string().trim().min(2).max(120),
  role: z
    .enum(['Receptionist', 'Cafe Cashier', 'Floor Supervisor', 'Technician', 'Manager'])
    .default('Receptionist'),
  email: z.string().trim().email().or(z.literal('')).default(''),
  phone: z.string().trim().max(30).default(''),
  shift: z.enum(['Morning', 'Midday', 'Evening', 'Night']).default('Morning'),
  hourly_rate: money.default(0),
  hire_date: dateString.nullish(),
  emergency_contact: z.string().trim().max(30).default(''),
});

export const maintenanceSchema = z.object({
  title: z.string().trim().min(2).max(160),
  location: z.string().trim().max(120).default(''),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).default('Medium'),
  description: z.string().trim().max(1000).default(''),
  assigned_to: uuid.nullish(),
});

export const lostFoundSchema = z.object({
  description: z.string().trim().min(2).max(200),
  category: z.enum(['Phone', 'Wallet', 'Accessory', 'Clothing', 'Other']).default('Other'),
  found_location: z.string().trim().max(120).default(''),
  found_by: z.string().trim().max(120).default(''),
  notes: z.string().trim().max(500).default(''),
});

export const feedbackSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  tags: z.array(z.string().trim().max(40)).max(10).default([]),
  notes: z.string().trim().max(500).default(''),
});

export const waitingSchema = z.object({
  name: z.string().trim().min(1).max(120),
  party_size: positiveInt.max(30),
  room_preference: z.enum(['Standard', 'Premium', 'VIP', 'Any']).default('Any'),
  game: z.string().trim().max(80).nullish(),
  phone: z.string().trim().max(30).nullish(),
  notes: z.string().trim().max(300).nullish(),
  customer_id: uuid.nullish(),
});

export const hardwareSchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: z.enum(['Console', 'Controller', 'Headset', 'Monitor', 'Cable']).default('Controller'),
  model: z.string().trim().max(80).default(''),
  serial: z.string().trim().min(1).max(80),
  location: z.string().trim().max(120).default('Store'),
  condition: z.enum(['Excellent', 'Good', 'Fair', 'Poor']).default('Good'),
  purchase_date: dateString.nullish(),
  notes: z.string().trim().max(500).default(''),
});

export type ReservationInput = z.infer<typeof reservationSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type SaleInput = z.infer<typeof saleSchema>;
