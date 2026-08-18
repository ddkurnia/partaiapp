import {
  LayoutDashboard,
  Users,
  UserCheck,
  Map,
  BarChart3,
  Activity,
  Bell,
  Shield,
  Settings,
  Trophy,
  HelpCircle,
  Gift,
  ClipboardCheck,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  roles: string[];
  badge?: string;
}

export const MAIN_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['super_admin', 'admin_kabupaten', 'admin_kecamatan', 'admin_desa', 'kader', 'viewer'] },
  { label: 'Anggota', path: '/members', icon: Users, roles: ['super_admin', 'admin_kabupaten', 'admin_kecamatan', 'admin_desa', 'kader'] },
  { label: 'Kader', path: '/cadres', icon: UserCheck, roles: ['super_admin', 'admin_kabupaten', 'admin_kecamatan'] },
  { label: 'Wilayah', path: '/regions', icon: Map, roles: ['super_admin', 'admin_kabupaten', 'admin_kecamatan'] },
  { label: 'Peta', path: '/map', icon: Map, roles: ['super_admin', 'admin_kabupaten', 'admin_kecamatan'] },
  { label: 'Statistik', path: '/statistics', icon: BarChart3, roles: ['super_admin', 'admin_kabupaten', 'admin_kecamatan'] },
  { label: 'Aktivitas', path: '/activities', icon: Activity, roles: ['super_admin', 'admin_kabupaten', 'admin_kecamatan', 'admin_desa'] },
  { label: 'Verifikasi', path: '/verification', icon: ClipboardCheck, roles: ['super_admin', 'admin_kabupaten', 'admin_kecamatan'] },
];

export const MORE_NAV: NavItem[] = [
  { label: 'Quiz', path: '/quiz', icon: HelpCircle, roles: ['kader', 'admin_desa', 'admin_kecamatan', 'admin_kabupaten', 'super_admin'] },
  { label: 'Leaderboard', path: '/leaderboard', icon: Trophy, roles: ['kader', 'admin_desa', 'admin_kecamatan', 'admin_kabupaten', 'super_admin'] },
  { label: 'Reward', path: '/rewards', icon: Gift, roles: ['kader', 'admin_desa', 'admin_kecamatan', 'admin_kabupaten', 'super_admin'] },
  { label: 'Notifikasi', path: '/notifications', icon: Bell, roles: ['super_admin', 'admin_kabupaten', 'admin_kecamatan', 'admin_desa', 'kader', 'viewer'] },
  { label: 'Audit Log', path: '/audit', icon: Shield, roles: ['super_admin', 'admin_kabupaten'] },
  { label: 'Pengaturan', path: '/settings', icon: Settings, roles: ['super_admin', 'admin_kabupaten'] },
];

export const KADER_NAV: NavItem[] = [
  { label: 'Beranda', path: '/kader', icon: LayoutDashboard, roles: ['kader'] },
  { label: 'Tambah Anggota', path: '/members/new', icon: Users, roles: ['kader'] },
  { label: 'Anggota Saya', path: '/members', icon: Users, roles: ['kader'] },
  { label: 'Aktivitas', path: '/activities', icon: Activity, roles: ['kader'] },
  { label: 'Pelatihan', path: '/quiz', icon: HelpCircle, roles: ['kader'] },
  { label: 'Leaderboard', path: '/leaderboard', icon: Trophy, roles: ['kader'] },
  { label: 'Reward', path: '/rewards', icon: Gift, roles: ['kader'] },
  { label: 'Profil', path: '/settings', icon: Settings, roles: ['kader'] },
];
