import {
  collection, query, where, orderBy, limit, startAfter,
  getDocs, type DocumentSnapshot, type QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ActivityLog } from '@/types';

const COL = 'activity_logs';

export interface ActivityFilters {
  userId?: string;
  targetType?: string;
  districtId?: string;
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
  constraints.push(orderBy('timestamp', 'desc'));
  constraints.push(limit(pageSize + 1));
  if (startAfterDoc) constraints.push(startAfter(startAfterDoc));

  const snap = await getDocs(query(collection(db, COL), ...constraints));
  const docs = snap.docs;
  const hasMore = docs.length > pageSize;
  const data = docs.slice(0, pageSize).map(d => ({
    activityId: d.id, ...d.data(),
  } as ActivityLog));
  return { data, hasNextPage: hasMore, lastDoc: hasMore ? docs[pageSize - 1] : (docs.length > 0 ? docs[docs.length - 1] : null) };
}

export const TARGET_TYPES = [
  { value: 'member', label: 'Anggota' },
  { value: 'region', label: 'Wilayah' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'export', label: 'Ekspor' },
  { value: 'user', label: 'Pengguna' },
] as const;