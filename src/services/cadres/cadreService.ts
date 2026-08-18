import {
  collection, doc, getDoc, getDocs, query, where, orderBy, limit,
  startAfter, updateDoc, type DocumentSnapshot, type QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getDistrictName, getVillageName } from '@/constants/regions';
import { getLevelFromXP } from '@/constants/roles';
import type { UserProfile } from '@/types';

const USERS_COL = 'users';
const MEMBERS_COL = 'members';

export interface CadreFilters {
  districtId?: string;
}

export interface CadreListResult {
  data: CadreProfile[];
  hasNextPage: boolean;
  lastDoc: DocumentSnapshot | null;
}

export interface CadreProfile extends UserProfile {
  districtName?: string;
  villageName?: string;
  level: number;
  memberCount: number;
  verifiedCount: number;
}

export async function getCadresPaginated({
  filters = {}, pageSize = 20, startAfterDoc = null,
}: { filters?: CadreFilters; pageSize?: number; startAfterDoc?: DocumentSnapshot | null } = {}): Promise<CadreListResult> {
  const constraints: QueryConstraint[] = [
    where('role', 'in', ['kader', 'admin_desa', 'admin_kecamatan']),
    orderBy('createdAt', 'desc'),
    limit(pageSize + 1),
  ];
  if (filters.districtId) constraints.splice(1, 0, where('districtId', '==', filters.districtId));
  if (startAfterDoc) constraints.push(startAfter(startAfterDoc));

  const snap = await getDocs(query(collection(db, USERS_COL), ...constraints));
  const docs = snap.docs;
  const hasMore = docs.length > pageSize;
  const raw = docs.slice(0, pageSize).map(d => ({ uid: d.id, ...d.data() } as UserProfile));

  const data: CadreProfile[] = await Promise.all(
    raw.map(async (u) => {
      const memberCount = await countByRegisteredBy(u.uid);
      const verifiedCount = await countVerified(u.uid);
      return {
        ...u,
        level: getLevelFromXP(u.xp || 0),
        districtName: u.districtId ? getDistrictName(u.districtId) : undefined,
        villageName: u.villageId ? getVillageName(u.districtId || '', u.villageId) : undefined,
        memberCount,
        verifiedCount,
      };
    }),
  );
  return { data, hasNextPage: hasMore, lastDoc: hasMore ? docs[pageSize - 1] : (docs.length > 0 ? docs[docs.length - 1] : null) };
}

async function countByRegisteredBy(userId: string): Promise<number> {
  const snap = await getDocs(query(collection(db, MEMBERS_COL), where('registeredBy', '==', userId)));
  return snap.size;
}

async function countVerified(userId: string): Promise<number> {
  const snap = await getDocs(query(
    collection(db, MEMBERS_COL),
    where('registeredBy', '==', userId),
    where('verificationStatus', '==', 'verified'),
  ));
  return snap.size;
}

export async function updateCadreXP(userId: string, xpToAdd: number): Promise<void> {
  const snap = await getDoc(doc(db, USERS_COL, userId));
  if (!snap.exists()) return;
  const current = (snap.data().xp as number) || 0;
  const newXP = current + xpToAdd;
  await updateDoc(doc(db, USERS_COL, userId), {
    xp: newXP,
    level: getLevelFromXP(newXP),
    updatedAt: Date.now(),
  });
}

export async function getCadreStats() {
  const snap = await getDocs(query(collection(db, USERS_COL), where('role', 'in', ['kader', 'admin_desa', 'admin_kecamatan'])));
  let totalXP = 0;
  snap.docs.forEach(d => { totalXP += (d.data().xp as number) || 0; });
  const avgLevel = snap.size > 0
    ? snap.docs.reduce((s, d) => s + getLevelFromXP((d.data().xp as number) || 0), 0) / snap.size
    : 0;
  return { totalCadres: snap.size, totalXP, avgLevel: Math.round(avgLevel * 10) / 10 };
}