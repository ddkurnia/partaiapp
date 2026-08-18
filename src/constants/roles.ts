import type { UserRole } from '@/types';

export const ROLES: Record<UserRole, { label: string; level: number; description: string }> = {
  super_admin: {
    label: 'Super Admin',
    level: 100,
    description: 'Akses penuh ke seluruh sistem',
  },
  admin_kabupaten: {
    label: 'Admin Kabupaten',
    level: 80,
    description: 'Mengelola data tingkat kabupaten',
  },
  admin_kecamatan: {
    label: 'Admin Kecamatan',
    level: 60,
    description: 'Mengelola data kecamatan tertentu',
  },
  admin_desa: {
    label: 'Admin Desa',
    level: 40,
    description: 'Mengelola data desa tertentu',
  },
  kader: {
    label: 'Kader',
    level: 20,
    description: 'Pendataan dan aktivitas lapangan',
  },
  viewer: {
    label: 'Viewer',
    level: 10,
    description: 'Hanya dapat melihat data',
  },
};

export const ROLE_HIERARCHY: UserRole[] = [
  'super_admin',
  'admin_kabupaten',
  'admin_kecamatan',
  'admin_desa',
  'kader',
  'viewer',
];

export const DEFAULT_REGION = {
  provinceId: 'riau',
  provinceName: 'Riau',
  regencyId: 'kepulauan-meranti',
  regencyName: 'Kabupaten Kepulauan Meranti',
};

export const LEVEL_THRESHOLDS = [
  { level: 1, xpRequired: 0 },
  { level: 2, xpRequired: 100 },
  { level: 3, xpRequired: 250 },
  { level: 4, xpRequired: 500 },
  { level: 5, xpRequired: 1000 },
  { level: 6, xpRequired: 2000 },
  { level: 7, xpRequired: 3500 },
  { level: 8, xpRequired: 5500 },
  { level: 9, xpRequired: 8000 },
  { level: 10, xpRequired: 11000 },
  { level: 11, xpRequired: 15000 },
  { level: 12, xpRequired: 20000 },
  { level: 13, xpRequired: 26000 },
  { level: 14, xpRequired: 33000 },
  { level: 15, xpRequired: 42000 },
  { level: 16, xpRequired: 52000 },
  { level: 17, xpRequired: 64000 },
  { level: 18, xpRequired: 78000 },
  { level: 19, xpRequired: 94000 },
  { level: 20, xpRequired: 112000 },
];

export function getLevelFromXP(xp: number): number {
  let level = 1;
  for (const threshold of LEVEL_THRESHOLDS) {
    if (xp >= threshold.xpRequired) {
      level = threshold.level;
    } else {
      break;
    }
  }
  return level;
}

export function getXPForNextLevel(currentLevel: number): { current: number; required: number; progress: number } {
  const currentThreshold = LEVEL_THRESHOLDS.find(t => t.level === currentLevel);
  const nextThreshold = LEVEL_THRESHOLDS.find(t => t.level === currentLevel + 1);
  if (!nextThreshold) return { current: 0, required: 0, progress: 100 };
  if (!currentThreshold) return { current: 0, required: nextThreshold.xpRequired, progress: 0 };
  const range = nextThreshold.xpRequired - currentThreshold.xpRequired;
  return {
    current: currentThreshold.xpRequired,
    required: nextThreshold.xpRequired,
    progress: range > 0 ? Math.min(100, 0) : 100,
  };
}
