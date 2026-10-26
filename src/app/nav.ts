import {
  Bell,
  BookOpen,
  Building2,
  ClipboardList,
  FileClock,
  Gem,
  ImageOff,
  LayoutDashboard,
  type LucideIcon,
  ArrowLeftRight,
  Settings2,
  Shapes,
  Store,
  Trash2,
  Truck,
  Upload,
  UserRound,
  Users,
  BarChart3,
} from 'lucide-react';
import type { AppRole } from '@/lib/supabase';

export type NavItem = {
  to: string;
  label: string;
  short?: string; // label in the bottom tab bar
  icon: LucideIcon;
  roles: AppRole[];
  /** show in the phone bottom tab bar (max 5 per role incl. "More") */
  tab?: Partial<Record<AppRole, number>>;
  section?: 'main' | 'admin' | 'account';
  badge?: 'notifications';
};

const ALL: AppRole[] = ['super_admin', 'head_office', 'shop_user'];
const STAFF: AppRole[] = ['super_admin', 'head_office'];

export const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', short: 'Home', icon: LayoutDashboard, roles: STAFF, tab: { super_admin: 1, head_office: 1 } },
  { to: '/designs', label: 'All Designs', short: 'Designs', icon: Gem, roles: ALL, tab: { shop_user: 1, super_admin: 2, head_office: 2 } },
  { to: '/my-designs', label: 'My Designs', short: 'Mine', icon: Store, roles: ['shop_user'], tab: { shop_user: 2 } },
  { to: '/upload', label: 'Upload', icon: Upload, roles: ALL },
  { to: '/requests', label: 'Requests', icon: ArrowLeftRight, roles: ['shop_user'], tab: { shop_user: 3 } },
  { to: '/transfers', label: 'Transfers', icon: Truck, roles: STAFF, tab: { super_admin: 3, head_office: 3 } },
  { to: '/image-corrections', label: 'Image corrections', icon: ImageOff, roles: STAFF },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ALL },
  { to: '/notifications', label: 'Notifications', short: 'Alerts', icon: Bell, roles: ALL, tab: { shop_user: 4, head_office: 4 }, badge: 'notifications' },
  { to: '/admin/users', label: 'Users', icon: Users, roles: ['super_admin'], section: 'admin', tab: { super_admin: 4 } },
  { to: '/admin/outlets', label: 'Outlets', icon: Building2, roles: ['super_admin'], section: 'admin' },
  { to: '/admin/categories', label: 'Categories', icon: Shapes, roles: STAFF, section: 'admin' },
  { to: '/admin/settings', label: 'Settings', icon: Settings2, roles: ['super_admin'], section: 'admin' },
  { to: '/admin/audit', label: 'Audit log', icon: FileClock, roles: ['super_admin'], section: 'admin' },
  { to: '/admin/deleted', label: 'Deleted designs', icon: Trash2, roles: ['super_admin'], section: 'admin' },
  { to: '/profile', label: 'Profile', icon: UserRound, roles: ALL, section: 'account' },
];

export function navFor(role: AppRole | null | undefined) {
  if (!role) return { main: [], admin: [], account: [], tabs: [], more: [] };
  const items = NAV.filter((n) => n.roles.includes(role));
  const tabs = items
    .filter((n) => n.tab?.[role])
    .sort((a, b) => (a.tab![role]! - b.tab![role]!));
  const more = items.filter((n) => !n.tab?.[role] && n.to !== '/upload');
  return {
    main: items.filter((n) => !n.section || n.section === 'main'),
    admin: items.filter((n) => n.section === 'admin'),
    account: items.filter((n) => n.section === 'account'),
    tabs,
    more,
  };
}

export const HomeIcon = BookOpen;
export const ReportsIcon = ClipboardList;
