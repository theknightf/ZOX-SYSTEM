import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Load .env.local (and .env) into process.env — Node doesn't do this for us.
// ---------------------------------------------------------------------------
function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    try {
      const raw = readFileSync(resolve(__dirname, '..', file), 'utf8');
      for (const line of raw.split('\n')) {
        const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
        if (m && !process.env[m[1]]) {
          process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
        }
      }
    } catch {
      /* file not present — ignore */
    }
  }
}
loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const DEMO_USERS = [
  { email: 'owner@zoox-ps.com', password: 'ZooxOwner@2026', full_name: 'Zoox Owner', phone: '01000000000', role: 'owner' },
  { email: 'manager@zoox-ps.com', password: 'ZooxMgr@2026', full_name: 'Zoox Manager', phone: '01000000001', role: 'manager' },
  { email: 'staff@zoox-ps.com', password: 'ZooxStaff@2026', full_name: 'Zoox Staff', phone: '01000000002', role: 'staff' },
  { email: 'ahmed.k@gmail.com', password: 'AhmedK@2026', full_name: 'Ahmed Khaled', phone: '01012345678', role: 'customer' },
];

const ROOMS = [
  { name: 'VIP-1', room_type: 'VIP', status: 'Available', capacity: 4, controllers: 4, hourly_rate: 200, ps_model: 'PS5 Pro', category: 'playstation' },
  { name: 'Premium-1', room_type: 'Premium', status: 'Available', capacity: 4, controllers: 4, hourly_rate: 100, ps_model: 'PS5', category: 'playstation' },
  { name: 'Standard-1', room_type: 'Standard', status: 'Available', capacity: 2, controllers: 2, hourly_rate: 80, ps_model: 'PS5', category: 'playstation' },
  { name: 'Standard-2', room_type: 'Standard', status: 'Occupied', capacity: 2, controllers: 2, hourly_rate: 80, ps_model: 'PS4', category: 'playstation' },
  { name: 'Billiards-1', room_type: 'Standard', status: 'Available', capacity: 2, controllers: 0, hourly_rate: 80, ps_model: 'Pool Table', category: 'billiards' },
];

const CATALOG = [
  { name: 'Cola', category: 'Drinks', price: 30, emoji: '🥤' },
  { name: 'Water', category: 'Drinks', price: 15, emoji: '💧' },
  { name: 'Energy Drink', category: 'Drinks', price: 40, emoji: '⚡' },
  { name: 'Burger', category: 'Food', price: 90, emoji: '🍔' },
  { name: 'Fries', category: 'Food', price: 50, emoji: '🍟' },
  { name: 'Coffee', category: 'Drinks', price: 35, emoji: '☕' },
];

const INVENTORY = [
  { name: 'Cola Syrup', category: 'Beverages', sku: 'INV-COLA', stock: 40, reorder_level: 15, unit_price: 12, supplier: 'Coca-Cola' },
  { name: 'French Fries 1kg', category: 'Food', sku: 'INV-FRIES', stock: 8, reorder_level: 10, unit_price: 30, supplier: 'Local Supplier' },
  { name: 'PS5 Controller', category: 'Hardware', sku: 'INV-DUAL', stock: 8, reorder_level: 4, unit_price: 2500, supplier: 'Sony' },
  { name: 'Energy Drink', category: 'Beverages', sku: 'INV-NRG', stock: 30, reorder_level: 12, unit_price: 18, supplier: 'Red Bull' },
];

const CUSTOMERS = [
  { name: 'Ahmed Khaled', phone: '01012345678', email: 'ahmed.k@gmail.com', visits: 12, total_spent: 3200, loyalty_points: 1920, tier: 'Gold', last_visit: '2026-08-10' },
  { name: 'Mona Ali', phone: '01023456789', email: 'mona.a@gmail.com', visits: 4, total_spent: 640, loyalty_points: 384, tier: 'Silver', last_visit: '2026-08-05' },
  { name: 'Youssef Samir', phone: '01034567890', email: '', visits: 1, total_spent: 80, loyalty_points: 48, tier: 'Bronze', last_visit: '2026-07-28' },
];

const REWARDS = [
  { name: 'Free Hour', description: 'One free gaming hour', cost: 500, emoji: '🎮' },
  { name: 'Free Drink', description: 'Any beverage on the house', cost: 200, emoji: '🥤' },
];

function stockStatus(stock, reorder) {
  if (stock <= 0) return 'Out of Stock';
  if (stock <= reorder) return 'Low Stock';
  return 'In Stock';
}

async function ensureUser(u) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
    user_metadata: { full_name: u.full_name, phone: u.phone, role: u.role },
  });
  if (data?.user) {
    await supabase.from('profiles').upsert({ id: data.user.id, full_name: u.full_name, phone: u.phone, role: u.role });
    return data.user.id;
  }
  if (error && /already (exists|been registered)/i.test(error.message)) {
    const { data: list } = await supabase.auth.admin.listUsers();
    const existing = list?.users?.find((x) => x.email === u.email);
    if (existing) {
      await supabase.from('profiles').upsert({ id: existing.id, full_name: u.full_name, phone: u.phone, role: u.role });
      return existing.id;
    }
  }
  throw error ?? new Error(`createUser failed for ${u.email}`);
}

async function seedIfEmpty(table, rows) {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  if (error) throw error;
  if (count && count > 0) {
    console.log(`• ${table}: already has ${count} row(s) — skipped`);
    return;
  }
  const { error: insertError } = await supabase.from(table).insert(rows);
  if (insertError) throw insertError;
  console.log(`✓ ${table}: inserted ${rows.length} row(s)`);
}

async function main() {
  console.log('Seeding Zoox demo data...\n');

  const ids = {};
  for (const u of DEMO_USERS) {
    ids[u.role] = await ensureUser(u);
    console.log(`✓ user ${u.email} (${u.role})`);
  }

  await seedIfEmpty('rooms', ROOMS);

  await seedIfEmpty(
    'catalog_products',
    CATALOG.map((c) => ({ ...c, active: true }))
  );

  await seedIfEmpty(
    'inventory_items',
    INVENTORY.map((i) => ({ ...i, status: stockStatus(i.stock, i.reorder_level), last_restocked: '2026-08-01' }))
  );

  const customers = CUSTOMERS.map((c) =>
    c.email === 'ahmed.k@gmail.com' ? { ...c, auth_user_id: ids.customer } : c
  );
  await seedIfEmpty('customers', customers);

  const STAFF = [
    { profile_id: ids.manager, name: 'Zoox Manager', role: 'Manager', email: 'manager@zoox-ps.com', phone: '01000000001', shift: 'Morning', status: 'Active', hourly_rate: 150, hire_date: '2025-01-15', emergency_contact: '01099900001' },
    { profile_id: ids.staff, name: 'Zoox Staff', role: 'Receptionist', email: 'staff@zoox-ps.com', phone: '01000000002', shift: 'Evening', status: 'Active', hourly_rate: 90, hire_date: '2025-03-01', emergency_contact: '01099900002' },
    { name: 'Laila Hassan', role: 'Cafe Cashier', email: 'laila@zoox-ps.com', phone: '01055500003', shift: 'Midday', status: 'Active', hourly_rate: 80, hire_date: '2025-05-20', emergency_contact: '01099900003' },
    { name: 'Omar Nabil', role: 'Technician', email: 'omar@zoox-ps.com', phone: '01055500004', shift: 'Night', status: 'Active', hourly_rate: 110, hire_date: '2025-02-10', emergency_contact: '01099900004' },
  ];
  await seedIfEmpty('staff', STAFF);

  await seedIfEmpty('rewards', REWARDS);

  console.log('\n✅ Seed complete.');
}

main().catch((err) => {
  console.error('\n❌ Seed failed:', err?.message ?? err);
  process.exit(1);
});
