import type { BadgeDefinition } from '@/types';

// ---- XP Rewards for Actions ----

export const XP_REWARDS = {
  ADD_MEMBER: 10,
  VERIFY_MEMBER: 5,
  SCAN_KTP: 15,
  QUIZ_PASS: 50,
  QUIZ_COMPLETE: 20,
  DAILY_LOGIN: 5,
  FIRST_MEMBER: 25,
  STREAK_7: 50,
  STREAK_30: 200,
  IMPORT_BATCH: 30,
} as const;

export type XPRewardKey = keyof typeof XP_REWARDS;

export const XP_REWARD_LABELS: Record<XPRewardKey, string> = {
  ADD_MEMBER: 'Menambah Anggota',
  VERIFY_MEMBER: 'Verifikasi Anggota',
  SCAN_KTP: 'Scan KTP',
  QUIZ_PASS: 'Lulus Kuis',
  QUIZ_COMPLETE: 'Menyelesaikan Kuis',
  DAILY_LOGIN: 'Login Harian',
  FIRST_MEMBER: 'Anggota Pertama',
  STREAK_7: 'Streak 7 Hari',
  STREAK_30: 'Streak 30 Hari',
  IMPORT_BATCH: 'Impor Data',
};

// ---- Badge Definitions ----

export const BADGES: BadgeDefinition[] = [
  {
    id: 'kader_pemula',
    title: 'Kader Pemula',
    description: 'Bergabung sebagai kader',
    icon: 'Sprout',
    color: '#10b981',
    condition: 'automatic_on_role',
  },
  {
    id: 'pendata_pertama',
    title: 'Pendata Pertama',
    description: 'Menambahkan 1 anggota',
    icon: 'UserPlus',
    color: '#3b82f6',
    condition: 'member_count',
    memberCountThreshold: 1,
  },
  {
    id: 'pendata_aktif',
    title: 'Pendata Aktif',
    description: 'Menambahkan 10 anggota',
    icon: 'Users',
    color: '#8b5cf6',
    condition: 'member_count',
    memberCountThreshold: 10,
  },
  {
    id: 'pendata_sejati',
    title: 'Pendata Sejati',
    description: 'Menambahkan 50 anggota',
    icon: 'Award',
    color: '#f59e0b',
    condition: 'member_count',
    memberCountThreshold: 50,
  },
  {
    id: 'pendata_unggul',
    title: 'Pendata Unggul',
    description: 'Menambahkan 100 anggota',
    icon: 'Crown',
    color: '#ef4444',
    condition: 'member_count',
    memberCountThreshold: 100,
  },
  {
    id: 'pelajar_cerdas',
    title: 'Pelajar Cerdas',
    description: 'Menyelesaikan 1 kuis',
    icon: 'BookOpen',
    color: '#06b6d4',
    condition: 'quiz_count',
    quizCountThreshold: 1,
  },
  {
    id: 'pelajar_tekun',
    title: 'Pelajar Tekun',
    description: 'Menyelesaikan 5 kuis',
    icon: 'GraduationCap',
    color: '#6366f1',
    condition: 'quiz_count',
    quizCountThreshold: 5,
  },
  {
    id: 'sarjana_partai',
    title: 'Sarjana Partai',
    description: 'Menyelesaikan 15 kuis',
    icon: 'Star',
    color: '#eab308',
    condition: 'quiz_count',
    quizCountThreshold: 15,
  },
  {
    id: 'xp_100',
    title: 'Perintis',
    description: 'Mengumpulkan 100 XP',
    icon: 'Zap',
    color: '#f97316',
    condition: 'xp_threshold',
    xpThreshold: 100,
  },
  {
    id: 'xp_1000',
    title: 'Pejuang',
    description: 'Mengumpulkan 1.000 XP',
    icon: 'Flame',
    color: '#ef4444',
    condition: 'xp_threshold',
    xpThreshold: 1000,
  },
  {
    id: 'xp_5000',
    title: 'Legenda',
    description: 'Mengumpulkan 5.000 XP',
    icon: 'Gem',
    color: '#a855f7',
    condition: 'xp_threshold',
    xpThreshold: 5000,
  },
  {
    id: 'scanner',
    title: 'Scanner Andal',
    description: 'Scan 5 KTP',
    icon: 'ScanLine',
    color: '#14b8a6',
    condition: 'scan_count',
  },
];

export function getBadgeById(id: string): BadgeDefinition | undefined {
  return BADGES.find(b => b.id === id);
}

// ---- Quiz Categories ----

export const QUIZ_CATEGORIES = [
  { id: 'organisasi', label: 'Organisasi & Kepartaian', icon: 'Landmark' },
  { id: 'pendataan', label: 'Teknik Pendataan', icon: 'ClipboardList' },
  { id: 'kpu', label: 'Tata Cara Pemilu', icon: 'Vote' },
  { id: 'kebijakan', label: 'Kebijakan Publik', icon: 'ScrollText' },
  { id: 'meranti', label: 'Kab. Kepulauan Meranti', icon: 'MapPin' },
] as const;

export function getQuizCategoryLabel(id: string): string {
  return QUIZ_CATEGORIES.find(c => c.id === id)?.label || id;
}

// ---- Reward Categories ----

export const REWARD_CATEGORIES = [
  { id: 'merchandise', label: 'Merchandise' },
  { id: 'elektronik', label: 'Elektronik' },
  { id: 'voucher', label: 'Voucher' },
  { id: 'pengalaman', label: 'Pengalaman' },
  { id: 'sertifikat', label: 'Sertifikat' },
] as const;

export function getRewardCategoryLabel(id: string): string {
  return REWARD_CATEGORIES.find(c => c.id === id)?.label || id;
}

// ---- Leaderboard Periods ----

export type LeaderboardPeriod = 'weekly' | 'monthly' | 'alltime';

export const LEADERBOARD_PERIODS: { id: LeaderboardPeriod; label: string }[] = [
  { id: 'weekly', label: 'Mingguan' },
  { id: 'monthly', label: 'Bulanan' },
  { id: 'alltime', label: 'Sepanjang Masa' },
];
