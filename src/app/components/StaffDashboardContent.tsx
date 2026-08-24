'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, DoorOpen, ChevronRight, Monitor, Building2 } from 'lucide-react';
import DashboardTopBar from './DashboardTopBar';
import QuickStatsRow from './QuickStatsRow';
import RoomStatusGrid, { type Room } from './RoomStatusGrid';
import ActiveSessionsList, { type ActiveSession } from './ActiveSessionsList';
import UpcomingReservationsPanel from './UpcomingReservationsPanel';
import WaitingListPanel from './WaitingListPanel';
import QuickActionsPanel from './QuickActionsPanel';
import QuickActionsMenu from '@/app/live-sessions/components/QuickActionsMenu';
import QuickActionModal, {
  type QuickActionTarget,
  type QuickActionResponse,
} from '@/app/live-sessions/components/QuickActionModal';
import { useRole } from '@/contexts/AuthContext';
import RoomQuickActions from '@/components/rooms/RoomQuickActions';
import { roomsApi, useAsyncData, toastApiError } from '@/lib/api';
import { fetchLiveSessions } from '@/lib/api/sessions';
import { toast, Toaster } from 'sonner';
import { ZONES, type ZoneSession } from '@/data/zones';

type DashboardRole = 'staff' | 'manager' | 'owner';

type KPI = {
  id: string;
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
  delta?: string;
};

type DashboardConfig = {
  headline: string;
  subhead: string;
  showStartSession: boolean;
  showFullOwnerView: boolean;
  kpis: KPI[];
};

const BACKEND_STATUS: Record<Room['status'], 'Available' | 'Occupied' | 'Reserved' | 'Maintenance'> = {
  available: 'Available',
  occupied: 'Occupied',
  reserved: 'Reserved',
  maintenance: 'Maintenance',
};

/** Real rooms from the backend, enriched with any live session on them. */
async function loadDashboardRooms(): Promise<Room[]> {
  const [rooms, sessions] = await Promise.all([
    roomsApi.list(),
    fetchLiveSessions().catch(() => []),
  ]);
  return rooms.map((r) => {
    const session = sessions.find(
      (s) => s.roomId === r.id && (s.status === 'active' || s.status === 'paused')
    );
    return {
      id: r.id,
      name: r.name,
      type: r.roomType,
      capacity: r.capacity,
      status: r.status.toLowerCase() as Room['status'],
      currentCustomer: session?.customer,
      game: session?.game,
      sessionStart: session?.startTime,
      elapsedMinutes: session?.startMinutesAgo,
      controllers: r.controllers,
      quality: 4,
      psModel: r.psModel,
    };
  });
}

function roomTypeForZone(zone: ZoneSession): Room['type'] {
  if (zone.zoneType === 'playstation') return 'Standard';
  if (zone.zoneType === 'billiards') return 'Premium';
  return 'VIP';
}

function toActiveSession(zone: ZoneSession): ActiveSession {
  return {
    id: zone.id,
    room: zone.zoneName,
    roomType: roomTypeForZone(zone),
    customer: zone.customer,
    phone: '---',
    game: zone.products[0]?.name ?? 'Session',
    startTime: 'Now',
    startMinutesAgo: 0,
    players: zone.players,
    products: zone.products.reduce((sum, p) => sum + p.qty, 0),
    billTotal: Math.round(
      zone.products.reduce((sum, p) => sum + p.price * p.qty, 0) + zone.hourlyRate
    ),
    hourlyRate: zone.hourlyRate,
    sessionType: zone.sessionType,
    fixedDurationMinutes: zone.fixedDurationMinutes,
  };
}

function zoneToQuickTarget(zone: ZoneSession): QuickActionTarget {
  return {
    id: zone.id,
    label: zone.zoneName,
    customer: zone.customer,
    hourlyRate: zone.hourlyRate,
    sessionType: zone.sessionType,
    fixedDurationMinutes: zone.fixedDurationMinutes,
    extendedMinutes: zone.extendedMinutes,
    products: zone.products,
  };
}

function DashboardLayout({
  config,
  onStartSession,
  children,
}: {
  config: DashboardConfig;
  onStartSession: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative p-4 lg:p-6 xl:p-8 max-w-screen-2xl mx-auto space-y-6">
      <div className="relative z-10 space-y-6 stagger-in">
        <DashboardTopBar />
        <div className="glass-panel rounded-xl p-5 lg:p-6 relative overflow-hidden">
          <div className="pointer-events-none absolute -top-16 -right-10 w-56 h-56 rounded-full bg-primary/15 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="section-label mb-1.5">Console Overview</p>
              <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tightest">
                {config.headline}
              </h1>
              <p className="text-sm text-muted-foreground mt-1 font-medium">{config.subhead}</p>
            </div>
            {config.showStartSession && (
              <button
                onClick={onStartSession}
                className="bg-primary text-primary-foreground font-bold uppercase tracking-wider text-xs px-5 py-3 rounded-lg shadow-[0_0_18px_rgba(139,92,246,0.3)] hover:shadow-[0_0_28px_rgba(139,92,246,0.45)] transition-all active:scale-95 flex items-center gap-2"
              >
                Start Session
              </button>
            )}
          </div>
        </div>

        <div
          className={`grid grid-cols-2 ${config.kpis.length > 2 ? 'xl:grid-cols-4' : ''} gap-5`}
        >
          {config.kpis.map((stat) => (
            <div key={stat.id} className="glass-panel glow-hover rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground font-semibold">{stat.label}</span>
                <span className={stat.color}>{stat.icon}</span>
              </div>
              <div className={`text-2xl lg:text-[1.7rem] font-extrabold tracking-tight font-tabular ${stat.color}`}>
                {stat.value}
              </div>
              {stat.delta ? (
                <span className="stat-delta text-primary bg-primary/10">{stat.delta}</span>
              ) : null}
              <p className="text-xs text-muted-foreground mt-1.5">{stat.sub}</p>
            </div>
          ))}
        </div>

        {children}
      </div>
    </div>
  );
}

function SimpleRoomGrid({
  rooms,
  onSelect,
  onRoomStatusChange,
}: {
  rooms: Room[];
  onSelect: (room: Room) => void;
  onRoomStatusChange: (roomId: string, status: Room['status'], note?: string) => void;
}) {
  const statusClass: Record<Room['status'], string> = {
    available: 'bg-success text-success',
    occupied: 'bg-danger text-danger',
    reserved: 'bg-warning text-warning',
    maintenance: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="glass-panel rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Room Grid</h2>
          <p className="text-xs text-muted-foreground">Tap a room for details · Quick Actions on every card</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {rooms.map((room) => (
          <div
            key={room.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(room)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onSelect(room);
            }}
            className="text-left glass-panel rounded-xl p-4 hover:border-primary/40 transition-all duration-200 cursor-pointer flex flex-col"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-foreground">{room.name}</p>
                {room.status === 'occupied' && room.currentCustomer ? (
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {room.currentCustomer}
                  </p>
                ) : null}
              </div>
              <span
                className={`px-2 py-1 rounded-full text-[11px] font-semibold ${statusClass[room.status]}`}
              >
                {room.status}
              </span>
            </div>
            {/* Quick Actions — independent from the card click */}
            <div
              className="mt-auto pt-3"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <RoomQuickActions
                room={room}
                onStatusChange={(next, note) => onRoomStatusChange(room.id, next, note)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoomDetailModal({ room, onClose }: { room: Room; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md glass-panel rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-foreground">{room.name}</h3>
            <p className="text-xs text-muted-foreground">{room.psModel}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <ChevronRight size={18} className="rotate-45" />
          </button>
        </div>
        <div className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            Status: <span className="text-foreground">{room.status}</span>
          </p>
          <p className="text-muted-foreground">
            Controllers: <span className="text-foreground">{room.controllers}</span>
          </p>
          <p className="text-muted-foreground">
            Max Players: <span className="text-foreground">{room.capacity}</span>
          </p>
          <p className="text-muted-foreground">
            Quality: <span className="text-foreground">{room.quality}/5</span>
          </p>
          {room.currentCustomer && (
            <p className="text-muted-foreground">
              Customer: <span className="text-foreground">{room.currentCustomer}</span>
            </p>
          )}
          {room.game && (
            <p className="text-muted-foreground">
              Game: <span className="text-foreground">{room.game}</span>
            </p>
          )}
          {room.elapsedMinutes != null && (
            <p className="text-muted-foreground">
              Elapsed: <span className="text-foreground">{room.elapsedMinutes}m</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const configByRole: Record<DashboardRole, DashboardConfig> = {
  staff: {
    headline: 'Staff Dashboard',
    subhead: 'Fast room assignment and live floor control.',
    showStartSession: true,
    showFullOwnerView: false,
    kpis: [
      {
        id: 'available',
        label: 'Available Rooms',
        value: '2',
        sub: 'ready now',
        delta: '+1 vs last hr',
        icon: <DoorOpen size={18} />,
        color: 'text-primary',
        bg: 'bg-primary/10',
        border: 'border-primary/20',
      },
      {
        id: 'waiting',
        label: 'Waiting Customers',
        value: '3',
        sub: 'queued at desk',
        icon: <Clock size={18} />,
        color: 'text-warning',
        bg: 'bg-warning/10',
        border: 'border-warning/20',
      },
    ],
  },
  manager: {
    headline: 'Manager Dashboard',
    subhead: 'Operational control with roll-up performance summary.',
    showStartSession: true,
    showFullOwnerView: false,
    kpis: [
      {
        id: 'available',
        label: 'Available Rooms',
        value: '2',
        sub: 'ready now',
        delta: '+1 today',
        icon: <DoorOpen size={18} />,
        color: 'text-primary',
        bg: 'bg-primary/10',
        border: 'border-primary/20',
      },
      {
        id: 'waiting',
        label: 'Waiting Customers',
        value: '3',
        sub: 'queued at desk',
        icon: <Clock size={18} />,
        color: 'text-warning',
        bg: 'bg-warning/10',
        border: 'border-warning/20',
      },
      {
        id: 'sessions',
        label: "Today's Sessions",
        value: '18',
        sub: 'started so far',
        delta: '+14.2%',
        icon: <Monitor size={18} />,
        color: 'text-accent',
        bg: 'bg-accent/10',
        border: 'border-accent/20',
      },
      {
        id: 'occupancy',
        label: 'Occupancy Rate',
        value: '72%',
        sub: 'rooms in use',
        delta: '+6% vs avg',
        icon: <Building2 size={18} />,
        color: 'text-info',
        bg: 'bg-info/10',
        border: 'border-info/20',
      },
    ],
  },
  owner: {
    headline: 'Owner Dashboard',
    subhead: 'Full business overview including finance and management.',
    showStartSession: false,
    showFullOwnerView: true,
    kpis: [],
  },
};

export default function StaffDashboardContent() {
  const role = (useRole() ?? 'staff') as DashboardRole;
  const config = configByRole[role];
  const [zones, setZones] = useState<ZoneSession[]>(() => structuredClone(ZONES));
  const { data: backendRooms } = useAsyncData(loadDashboardRooms, []);
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    if (backendRooms) setRooms(backendRooms);
  }, [backendRooms]);

  const handleRoomStatusChange = (roomId: string, status: Room['status'], note?: string) => {
    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId
          ? { ...r, status, note: note ?? (status === 'available' ? undefined : r.note) }
          : r
      )
    );
    roomsApi
      .update(roomId, { status: BACKEND_STATUS[status] })
      .then(() => toast.success(`${status.charAt(0).toUpperCase() + status.slice(1)} saved`))
      .catch((err) => {
        toastApiError(err);
        if (backendRooms) setRooms(backendRooms); // revert on failure
      });
  };
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedZone, setSelectedZone] = useState<ZoneSession | null>(null);
  const router = useRouter();

  const activeZones = useMemo(() => zones.filter((zone) => zone.status === 'active'), [zones]);
  const activeSessions = useMemo(() => activeZones.map(toActiveSession), [activeZones]);

  const handleQuickApply = (updated: QuickActionTarget, result: QuickActionResponse) => {
    setZones((prev) =>
      prev.map((zone) =>
        zone.id !== updated.id
          ? zone
          : {
              ...zone,
              customer: updated.customer,
              products: (result.target?.products ?? zone.products) as ZoneSession['products'],
              hourlyRate: updated.hourlyRate,
              sessionType: updated.sessionType,
              fixedDurationMinutes:
                result.target?.fixedDurationMinutes ?? updated.fixedDurationMinutes,
              extendedMinutes: result.target?.extendedMinutes ?? updated.extendedMinutes,
            }
      )
    );
    toast.success(`Updated ${updated.label}`);
    setSelectedZone(null);
  };

  if (config.showFullOwnerView) {
    return (
      <div className="relative p-4 lg:p-6 xl:p-8 max-w-screen-2xl mx-auto space-y-6">
        <Toaster position="bottom-right" theme="system" />
        <div className="aurora-blob aurora-blob-violet absolute -top-24 -left-24 w-[28rem] h-[28rem] rounded-full" />
        <div className="aurora-blob aurora-blob-emerald absolute top-1/3 -right-32 w-[26rem] h-[26rem] rounded-full" />
        <div className="aurora-blob aurora-blob-gold absolute bottom-0 left-1/3 w-[24rem] h-[24rem] rounded-full" />
        <div className="relative z-10 space-y-6 stagger-in">
          <DashboardTopBar />
          <QuickStatsRow />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <RoomStatusGrid rooms={rooms} onRoomStatusChange={handleRoomStatusChange} />
              <ActiveSessionsList sessions={activeSessions} />
            </div>
            <div className="lg:col-span-1 space-y-4">
              <QuickActionsPanel onQuickAction={() => setQuickMenuOpen(true)} />
              <UpcomingReservationsPanel />
              <WaitingListPanel />
            </div>
          </div>
        </div>
        {quickMenuOpen && (
          <QuickActionsMenu
            zones={activeZones}
            onClose={() => setQuickMenuOpen(false)}
            onSelect={(zone) => {
              setQuickMenuOpen(false);
              setSelectedZone(zone);
            }}
          />
        )}
        {selectedZone && (
          <QuickActionModal
            target={zoneToQuickTarget(selectedZone)}
            apiPath="/api/quick-action"
            onClose={() => setSelectedZone(null)}
            onApply={handleQuickApply}
          />
        )}
      </div>
    );
  }

  return (
    <DashboardLayout config={config} onStartSession={() => setQuickMenuOpen(true)}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {rooms.length === 0 ? (
            <div className="glass-panel rounded-xl p-16 text-center text-sm text-muted-foreground">
              Connecting to the floor…
            </div>
          ) : (
            <SimpleRoomGrid
              rooms={rooms}
              onSelect={setSelectedRoom}
              onRoomStatusChange={handleRoomStatusChange}
            />
          )}
        </div>
        <div className="lg:col-span-1 space-y-4">
          {role === 'manager' ? (
            <>
              <div className="glass-panel rounded-xl p-4">
                <h2 className="text-sm font-semibold text-foreground mb-2">Operational Summary</h2>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>Revenue today: 2,840 EGP</p>
                  <p>Hardware alerts: 2</p>
                  <p>Inventory alerts: 2</p>
                </div>
              </div>
              <WaitingListPanel />
              <UpcomingReservationsPanel />
            </>
          ) : (
            <div className="glass-panel rounded-xl p-4">
              <h2 className="text-sm font-semibold text-foreground mb-2">Fast Actions</h2>
              <button
                onClick={() => router.push('/live-sessions')}
                className="w-full flex items-center justify-between rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-left text-primary font-semibold"
              >
                Open Live Sessions
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {selectedRoom && (
        <RoomDetailModal room={selectedRoom} onClose={() => setSelectedRoom(null)} />
      )}

      {quickMenuOpen && (
        <QuickActionsMenu
          zones={activeZones}
          onClose={() => setQuickMenuOpen(false)}
          onSelect={(zone) => {
            setQuickMenuOpen(false);
            setSelectedZone(zone);
          }}
        />
      )}

      {selectedZone && (
        <QuickActionModal
          target={zoneToQuickTarget(selectedZone)}
          apiPath="/api/quick-action"
          onClose={() => setSelectedZone(null)}
          onApply={handleQuickApply}
        />
      )}
    </DashboardLayout>
  );
}
