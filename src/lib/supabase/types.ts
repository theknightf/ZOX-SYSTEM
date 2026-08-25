export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = 'owner' | 'manager' | 'staff' | 'customer';

export type RoomType = 'Standard' | 'Premium' | 'VIP';
export type RoomStatus = 'Available' | 'Occupied' | 'Reserved' | 'Maintenance';
export type ReservationStatus =
  'Reserved' | 'Arrived' | 'Active' | 'Completed' | 'Cancelled' | 'No Show' | 'Waiting' | 'Late';
export type SessionStatus = 'active' | 'paused' | 'completed' | 'cancelled';
export type SessionKind = 'open' | 'fixed';
export type ZoneCategory = 'playstation' | 'billiards' | 'cafe';
export type PaymentMethod = 'Cash' | 'Card' | 'Wallet' | 'Transfer';
export type StockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock';
export type HardwareType = 'Console' | 'Controller' | 'Headset' | 'Monitor' | 'Cable';
export type HardwareStatus = 'In Use' | 'Available' | 'Maintenance' | 'Retired';
export type HardwareCondition = 'Excellent' | 'Good' | 'Fair' | 'Poor';
export type LfCategory = 'Phone' | 'Wallet' | 'Accessory' | 'Clothing' | 'Other';
export type LfStatus = 'Unclaimed' | 'Returned' | 'Disposed';
export type FeedbackStatus = 'new' | 'reviewed';
export type LoyaltyTier = 'Bronze' | 'Silver' | 'Gold' | 'VIP';
export type MaintPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type TaskStatus = 'Open' | 'In Progress' | 'Done' | 'Cancelled';
export type StaffTitle =
  'Receptionist' | 'Cafe Cashier' | 'Floor Supervisor' | 'Technician' | 'Manager';
export type ShiftName = 'Morning' | 'Midday' | 'Evening' | 'Night';
export type StaffState = 'Active' | 'On Leave' | 'Terminated';
export type WaitingStatus = 'Waiting' | 'Notified' | 'Seated' | 'Cancelled';
export type AttendanceState = 'On Time' | 'Late' | 'Absent' | 'Off Duty';

export interface TableRow {
  id: string;
  created_at: string;
}

export interface Profile extends TableRow {
  id: string;
  full_name: string;
  phone: string;
  role: UserRole;
  updated_at: string;
}

export interface CustomerRow extends TableRow {
  auth_user_id: string | null;
  name: string;
  phone: string;
  email: string;
  visits: number;
  total_spent: number;
  loyalty_points: number;
  tier: LoyaltyTier;
  last_visit: string | null;
  notes: string;
  updated_at: string;
}

export interface RoomRow extends TableRow {
  name: string;
  room_type: RoomType;
  status: RoomStatus;
  capacity: number;
  controllers: number;
  hourly_rate: number;
  ps_model: string;
  category: ZoneCategory;
  updated_at: string;
}

export interface CatalogProductRow extends TableRow {
  name: string;
  category: string;
  price: number;
  emoji: string;
  active: boolean;
  updated_at: string;
}

export interface InventoryItemRow extends TableRow {
  name: string;
  category: string;
  sku: string;
  stock: number;
  reorder_level: number;
  unit_price: number;
  supplier: string;
  last_restocked: string | null;
  status: StockStatus;
  updated_at: string;
}

export interface ReservationRow extends TableRow {
  customer_id: string | null;
  guest_name: string;
  phone: string;
  room_id: string | null;
  category: ZoneCategory;
  game: string;
  players: number;
  res_date: string;
  res_time: string;
  duration_minutes: number | null;
  status: ReservationStatus;
  session_kind: SessionKind;
  notes: string | null;
  created_by_role: UserRole;
  updated_at: string;
}

export interface LiveSessionRow extends TableRow {
  room_id: string;
  reservation_id: string | null;
  customer_id: string | null;
  guest_name: string;
  phone: string;
  game: string;
  players: number;
  hourly_rate: number;
  session_kind: SessionKind;
  fixed_duration_minutes: number | null;
  extended_minutes: number;
  started_at: string;
  paused_seconds: number;
  paused_at: string | null;
  ended_at: string | null;
  status: SessionStatus;
  billed_minutes: number | null;
  time_cost: number | null;
  products_cost: number | null;
  total_cost: number | null;
  closed_by: string | null;
  updated_at: string;
}

export interface SessionProductRow extends TableRow {
  session_id: string;
  product_id: string | null;
  name: string;
  price: number;
  qty: number;
}

export interface HardwareRow extends TableRow {
  name: string;
  type: HardwareType;
  model: string;
  serial: string;
  room_id: string | null;
  location: string;
  status: HardwareStatus;
  condition: HardwareCondition;
  purchase_date: string | null;
  last_serviced: string | null;
  notes: string;
  updated_at: string;
}

export interface SaleRow extends TableRow {
  invoice_number: string;
  customer_id: string | null;
  walk_in_name: string;
  session_id: string | null;
  subtotal: number;
  tax: number;
  total: number;
  payment_method: PaymentMethod;
  sold_by: string | null;
  sold_at: string;
}

export interface SaleItemRow extends TableRow {
  sale_id: string;
  product_id: string | null;
  kind: 'product' | 'session_time';
  name: string;
  price: number;
  qty: number;
  emoji: string;
}

export interface ExpenseRow extends TableRow {
  title: string;
  category: string;
  amount: number;
  vendor: string;
  expense_date: string;
  payment_method: PaymentMethod;
  notes: string;
  recurring: boolean;
  recorded_by: string | null;
  updated_at: string;
}

export interface StaffRow extends TableRow {
  profile_id: string | null;
  name: string;
  role: StaffTitle;
  email: string;
  phone: string;
  shift: ShiftName;
  status: StaffState;
  hourly_rate: number;
  hire_date: string | null;
  emergency_contact: string;
  updated_at: string;
}

export interface AttendanceRow extends TableRow {
  staff_id: string;
  work_date: string;
  shift_label: ShiftName | null;
  shift_start: string | null;
  shift_end: string | null;
  status: AttendanceState;
  location: string;
  check_in_at: string | null;
  minutes_late: number;
}

export interface WaitingListRow extends TableRow {
  name: string;
  party_size: number;
  room_preference: 'Standard' | 'Premium' | 'VIP' | 'Any';
  game: string | null;
  phone: string | null;
  customer_id: string | null;
  joined_at: string;
  status: WaitingStatus;
  notified_at: string | null;
  seated_room_id: string | null;
  notes: string | null;
}

export interface MaintenanceTaskRow extends TableRow {
  title: string;
  location: string;
  priority: MaintPriority;
  status: TaskStatus;
  assigned_to: string | null;
  reported_by: string | null;
  reported_at: string;
  description: string;
  completed_at: string | null;
  updated_at: string;
}

export interface LostFoundRow extends TableRow {
  description: string;
  category: LfCategory;
  found_location: string;
  found_by: string;
  found_at: string;
  status: LfStatus;
  claimed_by: string;
  claimed_at: string | null;
  notes: string;
}

export interface FeedbackRow extends TableRow {
  customer_id: string | null;
  session_id: string | null;
  author_name: string;
  game: string;
  room_id: string | null;
  rating: number;
  tags: string[];
  notes: string;
  submitted_at: string;
  status: FeedbackStatus;
}

export interface RewardRow extends TableRow {
  name: string;
  description: string;
  cost: number;
  emoji: string;
  enabled: boolean;
}

export interface LoyaltyTransactionRow extends TableRow {
  customer_id: string;
  delta: number;
  reason: string;
  actor_id: string | null;
}

export interface AuditLogRow extends TableRow {
  actor_id: string | null;
  actor_name: string;
  actor_role: string;
  action: string;
  target_table: string;
  target_id: string | null;
  target_label: string;
  details: string;
  before_state: Json | null;
  after_state: Json | null;
  severity: 'Info' | 'Warning' | 'Critical';
}

export interface SettingsRow {
  id: 1;
  center_name: string;
  center_phone: string;
  center_address: string;
  currency: string;
  tax_rate: number;
  low_stock_threshold: number;
  standard_hourly: number;
  premium_hourly: number;
  vip_hourly: number;
  session_timeout_minutes: number;
  notifications_enabled: boolean;
  sound_enabled: boolean;
  maintenance_mode: boolean;
  updated_at: string;
  updated_by: string | null;
}

export interface RevenueDailyView {
  day: string;
  transactions: number;
  subtotal: number;
  tax: number;
  revenue: number;
}

export interface ExpensesDailyView {
  day: string;
  entries: number;
  spend: number;
}

export interface OccupancyDailyView {
  day: string;
  sessions: number;
  avg_minutes: number;
  room_minutes: number;
  revenue: number;
}

export interface TopCustomerView {
  id: string;
  name: string;
  tier: LoyaltyTier;
  visits: number;
  total_spent: number;
  loyalty_points: number;
}

/** Minimal hand-rolled Database shape for a typed supabase client. */
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      customers: { Row: CustomerRow; Insert: Partial<CustomerRow>; Update: Partial<CustomerRow> };
      rooms: { Row: RoomRow; Insert: Partial<RoomRow>; Update: Partial<RoomRow> };
      catalog_products: {
        Row: CatalogProductRow;
        Insert: Partial<CatalogProductRow>;
        Update: Partial<CatalogProductRow>;
      };
      inventory_items: {
        Row: InventoryItemRow;
        Insert: Partial<InventoryItemRow>;
        Update: Partial<InventoryItemRow>;
      };
      inventory_movements: {
        Row: TableRow & { item_id: string; delta: number; reason: string; actor_id: string | null };
        Insert: Record<string, never>;
        Update: Record<string, never>;
      };
      reservations: {
        Row: ReservationRow;
        Insert: Partial<ReservationRow>;
        Update: Partial<ReservationRow>;
      };
      live_sessions: {
        Row: LiveSessionRow;
        Insert: Partial<LiveSessionRow>;
        Update: Partial<LiveSessionRow>;
      };
      session_products: {
        Row: SessionProductRow;
        Insert: Partial<SessionProductRow>;
        Update: Partial<SessionProductRow>;
      };
      hardware: { Row: HardwareRow; Insert: Partial<HardwareRow>; Update: Partial<HardwareRow> };
      sales: { Row: SaleRow; Insert: Partial<SaleRow>; Update: Partial<SaleRow> };
      sale_items: { Row: SaleItemRow; Insert: Partial<SaleItemRow>; Update: Partial<SaleItemRow> };
      expenses: { Row: ExpenseRow; Insert: Partial<ExpenseRow>; Update: Partial<ExpenseRow> };
      staff: { Row: StaffRow; Insert: Partial<StaffRow>; Update: Partial<StaffRow> };
      attendance: {
        Row: AttendanceRow;
        Insert: Partial<AttendanceRow>;
        Update: Partial<AttendanceRow>;
      };
      waiting_list: {
        Row: WaitingListRow;
        Insert: Partial<WaitingListRow>;
        Update: Partial<WaitingListRow>;
      };
      maintenance_tasks: {
        Row: MaintenanceTaskRow;
        Insert: Partial<MaintenanceTaskRow>;
        Update: Partial<MaintenanceTaskRow>;
      };
      lost_found: {
        Row: LostFoundRow;
        Insert: Partial<LostFoundRow>;
        Update: Partial<LostFoundRow>;
      };
      feedback: { Row: FeedbackRow; Insert: Partial<FeedbackRow>; Update: Partial<FeedbackRow> };
      rewards: { Row: RewardRow; Insert: Partial<RewardRow>; Update: Partial<RewardRow> };
      loyalty_transactions: {
        Row: LoyaltyTransactionRow;
        Insert: Partial<LoyaltyTransactionRow>;
        Update: Partial<LoyaltyTransactionRow>;
      };
      audit_logs: { Row: AuditLogRow; Insert: Partial<AuditLogRow>; Update: Partial<AuditLogRow> };
      settings: { Row: SettingsRow; Insert: Partial<SettingsRow>; Update: Partial<SettingsRow> };
    };
    Views: {
      revenue_daily: { Row: RevenueDailyView };
      expenses_daily: { Row: ExpensesDailyView };
      occupancy_daily: { Row: OccupancyDailyView };
      top_customers_view: { Row: TopCustomerView };
    };
    Functions: {
      start_session: {
        Args: {
          p_room_id: string;
          p_guest_name?: string;
          p_phone?: string;
          p_game?: string;
          p_players?: number;
          p_session_kind?: 'open' | 'fixed';
          p_fixed_duration_minutes?: number | null;
          p_customer_id?: string | null;
          p_reservation_id?: string | null;
          p_controller_ids?: string[];
        };
        Returns: string;
      };
      pause_session: { Args: { p_session_id: string }; Returns: undefined };
      resume_session: { Args: { p_session_id: string }; Returns: undefined };
      extend_session: {
        Args: { p_session_id: string; p_minutes: number };
        Returns: undefined;
      };
      add_session_product: {
        Args: {
          p_session_id: string;
          p_product_id?: string | null;
          p_name?: string | null;
          p_price?: number | null;
          p_qty?: number;
        };
        Returns: undefined;
      };
      end_session: {
        Args: { p_session_id: string; p_payment_method?: 'Cash' | 'Card' | 'Wallet' | 'Transfer' };
        Returns: string;
      };
      adjust_inventory: {
        Args: { p_item_id: string; p_delta: number; p_reason?: string };
        Returns: number;
      };
      adjust_loyalty_points: {
        Args: { p_customer_id: string; p_delta: number; p_reason?: string };
        Returns: number;
      };
      check_in: { Args: { p_staff_id: string }; Returns: string };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
