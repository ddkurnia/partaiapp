import type { UserRole } from '@/types';
import { ROLES, ROLE_HIERARCHY } from '@/constants/roles';

export function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const userLevel = ROLES[userRole].level;
  const requiredLevel = ROLES[requiredRole].level;
  return userLevel >= requiredLevel;
}

export function canAccessRoute(userRole: UserRole, allowedRoles: string[]): boolean {
  return allowedRoles.includes(userRole);
}

export function canManageRegion(
  userRole: UserRole,
  userDistrictId: string | undefined,
  userVillageId: string | undefined,
  targetDistrictId?: string,
  targetVillageId?: string,
): boolean {
  if (userRole === 'super_admin' || userRole === 'admin_kabupaten') return true;
  if (userRole === 'admin_kecamatan') {
    return targetDistrictId === userDistrictId;
  }
  if (userRole === 'admin_desa') {
    return targetDistrictId === userDistrictId && targetVillageId === userVillageId;
  }
  return false;
}

export function maskNIK(nik: string): string {
  if (!nik || nik.length < 4) return '****';
  const last4 = nik.slice(-4);
  return '*'.repeat(nik.length - 4) + last4;
}

export function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '');
}

export function canViewNIK(userRole: UserRole): boolean {
  return ['super_admin', 'admin_kabupaten', 'admin_kecamatan'].includes(userRole);
}
