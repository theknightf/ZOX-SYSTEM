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

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: rooms, error } = await supabase.from('rooms').select('id, name, status, room_type');
if (error) { console.error('rooms:', error.message); process.exit(1); }
console.log('rooms:', rooms.map((r) => `${r.name}[${r.status}]`).join(', '));

const { data: sessions } = await supabase.from('live_sessions').select('id, room_id, status');
console.log('live sessions:', sessions?.length ?? 0);

if ((sessions?.length ?? 0) === 0) {
  const target = rooms.find((r) => r.name === 'Standard-2') ?? rooms.find((r) => r.status === 'Available');
  if (!target) { console.error('no room to start a session on'); process.exit(1); }
  const { data: sessionId, error: rpcError } = await supabase.rpc('start_session', {
    p_room_id: target.id,
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
  console.log(`✓ started session ${sessionId} on ${target.name}`);
}
