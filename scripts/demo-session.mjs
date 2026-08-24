import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    try {
      const raw = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
      for (const line of raw.split('\n')) {
        const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
      }
    } catch {}
  }
}
loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const { data: rooms, error } = await supabase.from('rooms').select('id, name, status');
if (error) { console.error('rooms:', error.message); process.exit(1); }

const { data: sessions } = await supabase
  .from('live_sessions')
  .select('id, status, room_id, rooms(name)');
const active = (sessions ?? []).filter((s) => s.status === 'active' || s.status === 'paused');
console.log(`active sessions: ${active.length}`);
for (const s of active) {
  const room = rooms.find((r) => r.id === s.room_id);
  console.log(`  • ${s.id} on ${room?.name ?? s.room_id} [${s.status}]`);
}

// Ensure the room marked "Occupied" actually has a running session.
const occupiedRoom = rooms.find((r) => r.status === 'Occupied');
const occupiedHasSession =
  occupiedRoom && active.some((s) => s.room_id === occupiedRoom.id);

if (occupiedRoom && !occupiedHasSession) {
  const { data: sessionId, error: rpcError } = await supabase.rpc('start_session', {
    p_room_id: occupiedRoom.id,
    p_guest_name: 'Demo Guest',
    p_phone: '',
    p_game: 'FC 26',
    p_players: 2,
    p_session_kind: 'open',
    p_fixed_duration_minutes: null,
    p_customer_id: null,
    p_reservation_id: null,
  });
  if (rpcError) { console.error('start_session:', rpcError.message); process.exit(1); }
  console.log(`✓ started session ${sessionId} on ${occupiedRoom.name} (was marked Occupied with no session)`);
} else if (occupiedHasSession) {
  console.log(`✓ ${occupiedRoom?.name} already has a running session`);
} else {
  console.log('no Occupied room to backfill — all consistent');
}
