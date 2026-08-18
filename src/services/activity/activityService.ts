import {
  collection, query, where, orderBy, limit, startAfter,
  getDocs, type DocumentSnapshot, type QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getDistrictName, getVillageName } from '@/constants/regions';
import type { ActivityLog, AuditLog } from '@/types';

const ACTIVITY_COL = 'activity_logs';
const AUDIT_COL = 'audit_logs';

export interface ActivityFilters {
  userId?: string;
  targetType?: string;
  districtId?: string;
  dateFrom?: number;
  dateTo?: number;
}

export async function getActivities({
  filters = {}, pageSize = 30, startAfterDoc = null,
}: {
  filters?: ActivityFilters;
  pageSize?: number;
  startAfterDoc?: DocumentSnapshot | null;
} = {}) {
  const constraints: QueryConstraint[] = [];
  if (filters.userId) constraints.push(where('userId', '==', filters.userId));
  if (filters.targetType) constraints.push(where('targetType', '==', filters.targetType));
  if (filters.districtId) constraints.push(where('districtId', '==', filters.districtId));
  if (filters.dateFrom) constraints.push(where('timestamp', '>=', filters.dateFrom));
  if (filters.dateTo) constraints.push(where('timestamp', '<=', filters.dateTo));
  constraints.push(orderBy('timestamp', 'desc'));
  constraints.push(limit(pageSize + 1));
  if (startAfterDoc) constraints.push(startAfter(startAfterDoc));

  const snap = await getDocs(query(collection(db, ACTIVITY_COL), ...constraints));
  const docs = snap.docs;
  const hasMore = docs.length > pageSize;
  const data = docs.slice(0, pageSize).map(d => {
    const raw = { activityId: d.id, ...d.data() } as ActivityLog;
    // Enrich with district/village names
    if (raw.districtId && !raw.districtName) {
      raw.districtName = getDistrictName(raw.districtId);
    }
    if (raw.villageId && !raw.villageName && raw.districtId) {
      raw.villageName = getVillageName(raw.districtId, raw.villageId);
    }
    return raw;
  });
  return {
    data,
    hasNextPage: hasMore,
    lastDoc: hasMore ? docs[pageSize - 1] : (docs.length > 0 ? docs[docs.length - 1] : null),
  };
}

export interface AuditFilters {
  action?: string;
  targetType?: string;
  userId?: string;
  dateFrom?: number;
  dateTo?: number;
}

export async function getAuditLogs({
  filters = {}, pageSize = 50, startAfterDoc = null,
}: {
  filters?: AuditFilters;
  pageSize?: number;
  startAfterDoc?: DocumentSnapshot | null;
} = {}) {
  const constraints: QueryConstraint[] = [];
  if (filters.action) constraints.push(where('action', '==', filters.action));
  if (filters.targetType) constraints.push(where('targetType', '==', filters.targetType));
  if (filters.userId) constraints.push(where('userId', '==', filters.userId));
  if (filters.dateFrom) constraints.push(where('timestamp', '>=', filters.dateFrom));
  if (filters.dateTo) constraints.push(where('timestamp', '<=', filters.dateTo));
  constraints.push(orderBy('timestamp', 'desc'));
  constraints.push(limit(pageSize + 1));
  if (startAfterDoc) constraints.push(startAfter(startAfterDoc));

  const snap = await getDocs(query(collection(db, AUDIT_COL), ...constraints));
  const docs = snap.docs;
  const hasMore = docs.length > pageSize;
  const data = docs.slice(0, pageSize).map(d => ({
    auditId: d.id,
    ...d.data(),
  } as AuditLog));
  return {
    data,
    hasNextPage: hasMore,
    lastDoc: hasMore ? docs[pageSize - 1] : (docs.length > 0 ? docs[docs.length - 1] : null),
  };
}

export const TARGET_TYPES = [
  { value: 'member', label: 'Anggota' },
  { value: 'kader', label: 'Kader' },
  { value: 'kader_target', label: 'Target Kader' },
  { value: 'region', label: 'Wilayah' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'export', label: 'Ekspor' },
  { value: 'user', label: 'Pengguna' },
] as const;

export const AUDIT_ACTIONS = [
  { value: 'create', label: 'Buat' },
  { value: 'update', label: 'Ubah' },
  { value: 'delete', label: 'Hapus' },
  { value: 'update_xp', label: 'Tambah XP' },
  { value: 'verify', label: 'Verifikasi' },
  { value: 'export', label: 'Ekspor' },
  { value: 'login', label: 'Login' },
] as const;
