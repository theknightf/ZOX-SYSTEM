import React from 'react';
import { Monitor, Users, Gamepad2, TrendingUp } from 'lucide-react';

const liveStats = [
  {
    id: 'bp-stat-1',
    label: 'Active Sessions',
    value: '6',
    icon: <Monitor size={14} />,
    color: 'text-accent',
  },
  {
    id: 'bp-stat-2',
    label: 'Waiting',
    value: '3',
    icon: <Users size={14} />,
    color: 'text-warning',
  },
  {
    id: 'bp-stat-3',
    label: 'Hardware Active',
    value: '40',
    icon: <Gamepad2 size={14} />,
    color: 'text-primary',
  },
  {
    id: 'bp-stat-4',
    label: 'Revenue Today',
    value: '2,840',
    icon: <TrendingUp size={14} />,
    color: 'text-accent',
  },
];

const avatarColors = ['#7c3aed', '#4edea3', '#e9c400', '#8ab4ff'];
const avatarInitials = ['AH', 'OS', 'KA', 'RK'];

export default function BrandPanel() {
  return (
    <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] bg-card border-r border-border flex-col justify-between p-10 relative overflow-hidden">
      {/* Ambient glowing orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-24 w-[28rem] h-[28rem] bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute -bottom-32 -right-16 w-[24rem] h-[24rem] bg-accent/15 rounded-full blur-[120px]" />
      </div>
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-11 h-11 bg-gradient-to-br from-[#a78bfa] via-primary to-[#6d28d9] rounded-xl flex items-center justify-center glow-primary">
            <Gamepad2 size={22} className="text-white" />
          </div>
          <div>
            <span className="text-2xl font-black tracking-tight text-gradient">Zoox</span>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              PlayStation Center
            </p>
          </div>
        </div>

        <h2 className="text-4xl xl:text-5xl font-black text-foreground leading-[1.08] mb-5 tracking-tighter">
          Run your gaming center
          <br />
          <span className="text-shine">at full speed.</span>
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-sm font-medium">
          Manage rooms, sessions, reservations, café sales, and customer loyalty — all from one
          operational dashboard built for speed.
        </p>
      </div>
      <div className="relative z-10 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          {liveStats.map((stat) => (
            <div
              key={stat.id}
              className="glass-panel glow-hover border border-border rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={stat.color}>{stat.icon}</span>
                <span className="text-xs font-semibold text-muted-foreground">{stat.label}</span>
              </div>
              <p className={`text-2xl font-extrabold font-tabular ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {avatarInitials.map((ini, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-full border-2 border-card flex items-center justify-center text-[10px] font-bold text-background"
                style={{ backgroundColor: avatarColors[i] }}
              >
                {ini}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Trusted by top lounges globally.</p>
        </div>
      </div>
    </div>
  );
}
