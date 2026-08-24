'use client';
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import ThemeToggle from '@/components/ui/ThemeToggle';
import AccountSwitcher from '@/components/ui/AccountSwitcher';
import { useAuth } from '@/contexts/AuthContext';
import { roleLabels, initialsFor } from '@/lib/demoAccounts';
import {
  LayoutDashboard,
  CalendarClock,
  Monitor,
  Building2,
  Users,
  Clock,
  ShoppingCart,
  Package,
  Gamepad2,
  Wrench,
  PackageSearch,
  MessageSquare,
  Star,
  UserCog,
  BarChart3,
  Settings,
  ScrollText,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Bell,
  Menu,
  X,
  Repeat,
  UserCheck,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  section?: string;
}

const staffNav: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/staff-dashboard',
    icon: <LayoutDashboard size={18} />,
    section: 'main',
  },
  {
    label: 'Reservations',
    href: '/reservations',
    icon: <CalendarClock size={18} />,
    badge: 3,
    section: 'main',
  },
  {
    label: 'Live Sessions',
    href: '/live-sessions',
    icon: <Monitor size={18} />,
    badge: 6,
    section: 'main',
  },
  { label: 'Customers', href: '/customers', icon: <Users size={18} />, section: 'operations' },
  {
    label: 'Waiting List',
    href: '/waiting-list',
    icon: <Clock size={18} />,
    badge: 2,
    section: 'operations',
  },
];

const managerNav: NavItem[] = [
  ...staffNav,
  { label: 'Inventory', href: '/inventory', icon: <Package size={18} />, section: 'operations' },
  { label: 'Rooms', href: '/rooms', icon: <Building2 size={18} />, section: 'operations' },
  { label: 'Reports', href: '/reports', icon: <BarChart3 size={18} />, section: 'analytics' },
  { label: 'Hardware', href: '/hardware', icon: <Gamepad2 size={18} />, section: 'support' },
  {
    label: 'Lost & Found',
    href: '/lost-found',
    icon: <PackageSearch size={18} />,
    section: 'support',
  },
];

const ownerNav: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/staff-dashboard',
    icon: <LayoutDashboard size={18} />,
    section: 'main',
  },
  {
    label: 'Reservations',
    href: '/reservations',
    icon: <CalendarClock size={18} />,
    badge: 3,
    section: 'main',
  },
  {
    label: 'Live Sessions',
    href: '/live-sessions',
    icon: <Monitor size={18} />,
    badge: 6,
    section: 'main',
  },
  { label: 'Rooms', href: '/rooms', icon: <Building2 size={18} />, section: 'main' },
  { label: 'Customers', href: '/customers', icon: <Users size={18} />, section: 'operations' },
  {
    label: 'Waiting List',
    href: '/waiting-list',
    icon: <Clock size={18} />,
    badge: 2,
    section: 'operations',
  },
  { label: 'Inventory', href: '/inventory', icon: <Package size={18} />, section: 'operations' },
  { label: 'Sales', href: '/sales', icon: <ShoppingCart size={18} />, section: 'operations' },
  { label: 'Expenses', href: '/expenses', icon: <BarChart3 size={18} />, section: 'finance' },
  { label: 'Hardware', href: '/hardware', icon: <Gamepad2 size={18} />, section: 'support' },
  { label: 'Maintenance', href: '/maintenance', icon: <Wrench size={18} />, section: 'support' },
  {
    label: 'Lost & Found',
    href: '/lost-found',
    icon: <PackageSearch size={18} />,
    section: 'support',
  },
  { label: 'Feedback', href: '/feedback', icon: <MessageSquare size={18} />, section: 'support' },
  { label: 'Loyalty', href: '/loyalty', icon: <Star size={18} />, section: 'crm' },
  { label: 'Staff', href: '/staff', icon: <UserCog size={18} />, section: 'crm' },
  {
    label: 'Staff Attendance',
    href: '/staff-attendance',
    icon: <UserCheck size={18} />,
    section: 'crm',
  },
  { label: 'Reports', href: '/reports', icon: <BarChart3 size={18} />, section: 'analytics' },
  {
    label: 'Audit Logs',
    href: '/audit-logs',
    icon: <ScrollText size={18} />,
    section: 'analytics',
  },
  { label: 'Settings', href: '/settings', icon: <Settings size={18} />, section: 'system' },
];

const customerNav: NavItem[] = [
  {
    label: 'My Dashboard',
    href: '/customer-dashboard',
    icon: <LayoutDashboard size={18} />,
    section: 'main',
  },
  {
    label: 'My Reservations',
    href: '/reservations',
    icon: <CalendarClock size={18} />,
    section: 'main',
  },
  {
    label: 'Book a Session',
    href: '/customer-dashboard',
    icon: <Monitor size={18} />,
    section: 'main',
  },
  { label: 'Loyalty Rewards', href: '/loyalty', icon: <Star size={18} />, section: 'crm' },
  { label: 'My Profile', href: '/customers', icon: <Users size={18} />, section: 'crm' },
  { label: 'Settings', href: '/settings', icon: <Settings size={18} />, section: 'system' },
];

const sectionLabels: Record<string, string> = {
  main: 'Operations',
  operations: 'Management',
  finance: 'Finance',
  support: 'Support',
  crm: 'CRM',
  analytics: 'Analytics',
  system: 'System',
};

interface SidebarProps {
  currentPath: string;
  role?: 'owner' | 'manager' | 'staff' | 'customer';
}

interface SidebarContentProps {
  collapsed: boolean;
  effectiveRole: 'owner' | 'manager' | 'staff' | 'customer';
  groupedNav: Record<string, NavItem[]>;
  isActive: (href: string) => boolean;
  roleLabel: string;
  roleColor: string;
  displayName: string;
  displayInitials: string;
  navRef: React.RefObject<HTMLElement | null>;
  onNavScroll: () => void;
  onSwitchAccount: () => void;
  onSignOut: () => void;
  onToggleCollapsed: () => void;
}

function SidebarContent({
  collapsed,
  effectiveRole,
  groupedNav,
  isActive,
  roleLabel,
  roleColor,
  displayName,
  displayInitials,
  navRef,
  onNavScroll,
  onSwitchAccount,
  onSignOut,
  onToggleCollapsed,
}: SidebarContentProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div
        className={`flex items-center border-b border-border transition-all duration-300 ${collapsed ? 'justify-center px-3 py-4' : 'px-4 py-4 gap-3'}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <AppLogo size={32} className="drop-shadow-[0_0_12px_rgba(139,92,246,0.5)]" />
          {!collapsed && (
            <div className="min-w-0">
              <span className="font-black text-lg tracking-tight">
                <span className="text-gradient">Zoox</span>
              </span>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-muted-foreground truncate">
                PlayStation Center
              </p>
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      {!collapsed && (
        <div className="px-4 py-3">
          <button className="w-full bg-primary text-primary-foreground font-semibold text-sm py-2.5 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-all duration-150 glow-primary active:scale-95">
            <span className="text-lg leading-none">+</span> New Session
          </button>
        </div>
      )}

      {/* Role badge */}
      {!collapsed && (
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-primary">{displayInitials}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
              <p className={`text-xs font-medium ${roleColor}`}>{roleLabel}</p>
            </div>
            <Bell size={14} className="ml-auto text-muted-foreground flex-shrink-0" />
          </div>
        </div>
      )}

      {/* Nav */}
      <nav
        ref={navRef}
        onScroll={onNavScroll}
        className="flex-1 overflow-y-auto scrollbar-thin py-3 px-2"
      >
        {Object.entries(groupedNav).map(([section, items], sectionIdx) => (
          <div key={`section-${section}`} className={sectionIdx > 0 ? 'mt-4' : ''}>
            {!collapsed && (
              <p className="section-label px-3 mb-1.5">{sectionLabels[section] || section}</p>
            )}
            {items.map((item) => (
              <Link
                key={`nav-${item.href}-${item.label}`}
                href={item.href === '/staff-dashboard' ? '/' : item.href}
                className={`nav-item mb-0.5 relative ${isActive(item.href) ? 'nav-item-active' : ''} ${collapsed ? 'justify-center px-2' : ''} hover:translate-x-0.5`}
                title={collapsed ? item.label : undefined}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!collapsed && <span className="truncate">{item.label}</span>}
                {!collapsed && item.badge && item.badge > 0 ? (
                  <span className="ml-auto bg-accent text-accent-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                    {item.badge}
                  </span>
                ) : null}
                {collapsed && item.badge && item.badge > 0 ? (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full" />
                ) : null}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-border p-2">
        {effectiveRole !== 'staff' && (
          <button
            onClick={onSwitchAccount}
            className={`nav-item w-full mb-1 ${collapsed ? 'justify-center' : ''} hover:bg-muted/70`}
            title={collapsed ? 'Switch Account' : undefined}
          >
            <Repeat size={18} />
            {!collapsed && <span>Switch Account</span>}
          </button>
        )}
        <div className="flex items-center gap-2 mb-2">
          <ThemeToggle />
          <button
            onClick={onSignOut}
            className={`nav-item flex-1 ${collapsed ? 'justify-center' : ''} hover:bg-muted/70`}
            title={collapsed ? 'Sign Out' : undefined}
          >
            <LogOut size={18} />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
        <button
          onClick={onToggleCollapsed}
          className={`nav-item w-full ${collapsed ? 'justify-center' : ''} hover:bg-muted/70`}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </div>
  );
}

export default function Sidebar({ currentPath, role = 'staff' }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const router = useRouter();
  const { user, logout } = useAuth();

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    try {
      const saved = sessionStorage.getItem('zoox-nav-scroll');
      if (saved) el.scrollTop = Number(saved) || 0;
    } catch {
      /* ignore */
    }
  }, []);

  const handleNavScroll = () => {
    const el = navRef.current;
    if (!el) return;
    try {
      sessionStorage.setItem('zoox-nav-scroll', String(el.scrollTop));
    } catch {
      /* ignore */
    }
  };

  const effectiveRole = user?.role ?? role;
  const navItems =
    effectiveRole === 'staff'
      ? staffNav
      : effectiveRole === 'manager'
        ? managerNav
        : effectiveRole === 'customer'
          ? customerNav
          : ownerNav;

  const groupedNav = navItems.reduce<Record<string, NavItem[]>>((acc, item) => {
    const section = item.section || 'main';
    if (!acc[section]) acc[section] = [];
    acc[section].push(item);
    return acc;
  }, {});

  const isActive = (href: string) => {
    if (href === '/staff-dashboard')
      return currentPath === '/' || currentPath === '/staff-dashboard';
    return currentPath === href;
  };

  const roleLabel = user
    ? roleLabels[user.role]
    : role === 'owner'
      ? 'Owner'
      : role === 'manager'
        ? 'Manager'
        : role === 'staff'
          ? 'Staff'
          : 'Customer';
  const roleColor = user
    ? user.color
    : role === 'owner'
      ? 'text-warning'
      : role === 'manager'
        ? 'text-info'
        : 'text-accent';
  const displayName = user?.name ?? 'Ahmed Hassan';
  const displayInitials = initialsFor(displayName);

  const handleSignOut = () => {
    logout();
    setMobileOpen(false);
    router.push('/sign-up-login-screen');
  };

  return (
    <>
      {switchOpen && <AccountSwitcher onClose={() => setSwitchOpen(false)} />}
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-card/90 backdrop-blur border border-border rounded-lg p-2 text-foreground shadow-lg"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 bg-card border-r border-border h-full z-10 slide-in-right shadow-2xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X size={18} />
            </button>
            <SidebarContent
              collapsed={collapsed}
              effectiveRole={effectiveRole}
              groupedNav={groupedNav}
              isActive={isActive}
              roleLabel={roleLabel}
              roleColor={roleColor}
              displayName={displayName}
              displayInitials={displayInitials}
              navRef={navRef}
              onNavScroll={handleNavScroll}
              onSwitchAccount={() => setSwitchOpen(true)}
              onSignOut={handleSignOut}
              onToggleCollapsed={() => setCollapsed(!collapsed)}
            />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-card border-r border-border h-screen sticky top-0 transition-all duration-300 ease-in-out flex-shrink-0 ${collapsed ? 'w-16' : 'w-60'}`}
      >
        <SidebarContent
          collapsed={collapsed}
          effectiveRole={effectiveRole}
          groupedNav={groupedNav}
          isActive={isActive}
          roleLabel={roleLabel}
          roleColor={roleColor}
          displayName={displayName}
          displayInitials={displayInitials}
          navRef={navRef}
          onNavScroll={handleNavScroll}
          onSwitchAccount={() => setSwitchOpen(true)}
          onSignOut={handleSignOut}
          onToggleCollapsed={() => setCollapsed(!collapsed)}
        />
      </aside>
    </>
  );
}
