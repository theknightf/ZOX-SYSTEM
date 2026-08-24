'use client';

import React, { useMemo, useState } from 'react';
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
};

type DashboardConfig = {
  headline: string;
  subhead: string;
  showStartSession: boolean;
  showFullOwnerView: boolean;
  kpis: KPI[];
};

const initialRooms: Room[] = [
  {
    id: 'room-001',
    name: 'Room 1',
    type: 'Standard',
    capacity: 2,
    status: 'occupied',
    currentCustomer: 'Mohamed K.',
    game: 'FC 26',
    sessionStart: '14:30',
    elapsedMinutes: 47,
    controllers: 2,
    quality: 3,
    psModel: 'PS5',
  },
  {
    id: 'room-002',
    name: 'Room 2',
    type: 'Standard',
    capacity: 4,
    status: 'occupied',
    currentCustomer: 'Ahmed & Group',
    game: 'GTA V',
    sessionStart: '13:45',
    elapsedMinutes: 92,
    controllers: 4,
    quality: 3,
    psModel: 'PS5',
  },
  {
    id: 'room-003',
    name: 'Room 3',
    type: 'Premium',
    capacity: 4,
    status: 'reserved',
    currentCustomer: 'Omar Sherif',
    game: 'Call of Duty',
    sessionStart: '16:00',
    elapsedMinutes: 0,
    controllers: 4,
    quality: 4,
    psModel: 'PS5',
  },
  {
    id: 'room-004',
    name: 'Room 4',
    type: 'VIP',
    capacity: 6,
    status: 'occupied',
    currentCustomer: 'Karim & Friends',
    game: 'FC 26',
    sessionStart: '14:00',
    elapsedMinutes: 77,
    controllers: 6,
    quality: 5,
    psModel: 'PS5 Pro',
    note: 'VIP - Extra drinks requested',
  },
  {
    id: 'room-005',
    name: 'Room 5',
    type: 'Standard',
    capacity: 2,
    status: 'available',
    controllers: 2,
    quality: 2,
    psModel: 'PS4',
  },
  {
    id: 'room-006',
    name: 'Room 6',
    type: 'Premium',
    capacity: 4,
    status: 'occupied',
    currentCustomer: 'Youssef M.',
    game: 'PES 2024',
    sessionStart: '15:10',
    elapsedMinutes: 27,
    controllers: 2,
    quality: 4,
    psModel: 'PS5',
  },
  {
    id: 'room-007',
    name: 'Room 7',
    type: 'Standard',
    capacity: 2,
    status: 'maintenance',
    controllers: 2,
    quality: 2,
    psModel: 'PS4',
    note: 'Controller #07 damaged',
  },
  {
    id: 'room-008',
    name: 'Room 8',
    type: 'VIP',
    capacity: 8,
    status: 'available',
    controllers: 8,
    quality: 5,
    psModel: 'PS5 Pro',
  },
];

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
              <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tightest">
                {config.headline}
              </h1>
              <p className="text-sm text-muted-foreground mt-1 font-medium">{config.subhead}</p>
            </div>
            {config.showStartSession && (
              <button
                onClick={onStartSession}
                className="btn-primary px-6 py-3 rounded-xl text-base shadow-lg shadow-primary/30"
              >
                Start Session
              </button>
            )}
          </div>
        </div>

        <div
          className={`grid grid-cols-1 md:grid-cols-2 ${config.kpis.length > 2 ? 'xl:grid-cols-4' : ''} gap-3`}
        >
          {config.kpis.map((stat) => (
            <div key={stat.id} className="glass-panel glow-hover rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-full ring-1 ${stat.bg} ${stat.border}`}>
                  <span className={stat.color}>{stat.icon}</span>
                </div>
              </div>
              <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
                {stat.label}
              </p>
              <p className={`text-3xl font-extrabold font-tabular mt-1.5 ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
            </div>
          ))}
        </div>

        {children}
      </div>
    </div>
  );
}

function SimpleRoomGrid({ rooms, onSelect }: { rooms: Room[]; onSelect: (room: Room) => void }) {
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
          <p className="text-xs text-muted-foreground">Tap a room for details</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {rooms.map((room) => (
          <button
            key={room.id}
            onClick={() => onSelect(room)}
            className="text-left glass-panel rounded-xl p-4 hover:border-primary/40 transition-all duration-200"
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
          </button>
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
        icon: <DoorOpen size={20} />,
        color: 'text-primary',
        bg: 'bg-primary/10',
        border: 'border-primary/20',
      },
      {
        id: 'waiting',
        label: 'Waiting Customers',
        value: '3',
        sub: 'queued at desk',
        icon: <Clock size={20} />,
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
        icon: <DoorOpen size={20} />,
        color: 'text-primary',
        bg: 'bg-primary/10',
        border: 'border-primary/20',
      },
      {
        id: 'waiting',
        label: 'Waiting Customers',
        value: '3',
        sub: 'queued at desk',
        icon: <Clock size={20} />,
        color: 'text-warning',
        bg: 'bg-warning/10',
        border: 'border-warning/20',
      },
      {
        id: 'sessions',
        label: "Today's Sessions",
        value: '18',
        sub: 'started so far',
        icon: <Monitor size={20} />,
        color: 'text-accent',
        bg: 'bg-accent/10',
        border: 'border-accent/20',
      },
      {
        id: 'occupancy',
        label: 'Occupancy Rate',
        value: '72%',
        sub: 'rooms in use',
        icon: <Building2 size={20} />,
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
  const [rooms] = useState<Room[]>(initialRooms);
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
              <RoomStatusGrid rooms={rooms} />
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
          <SimpleRoomGrid rooms={rooms} onSelect={setSelectedRoom} />
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
