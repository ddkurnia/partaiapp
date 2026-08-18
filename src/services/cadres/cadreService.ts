import {
  collection, doc, getDoc, getDocs, query, where, orderBy, limit,
  startAfter, updateDoc, addDoc, setDoc, deleteDoc,
  type DocumentSnapshot, type QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getDistrictName, getVillageName } from '@/constants/regions';
import { getLevelFromXP, getXPForNextLevel, LEVEL_THRESHOLDS } from '@/constants/roles';
import type { UserProfile, KaderProfile, KaderTarget, TrainingRecord } from '@/types';
import { logActivity, logAudit } from '@/services/firebase/analytics';

const USERS_COL = 'users';
const MEMBERS_COL = 'members';
const TARGETS_COL = 'kader_targets';
const TRAINING_COL = 'training_records';

export interface CadreFilters {
  districtId?: string;
  levelMin?: number;
  levelMax?: number;
}

export interface CadreListResult {
  data: KaderProfile[];
  hasNextPage: boolean;
  lastDoc: DocumentSnapshot | null;
}

export async function getCadresPaginated({
  filters = {}, pageSize = 20, startAfterDoc = null,
}: { filters?: CadreFilters; pageSize?: number; startAfterDoc?: DocumentSnapshot | null } = {}): Promise<CadreListResult> {
  const constraints: QueryConstraint[] = [
    where('role', 'in', ['kader', 'admin_desa', 'admin_kecamatan']),
    orderBy('createdAt', 'desc'),
    limit(pageSize + 1),
  ];
  if (filters.districtId) {
    constraints.splice(1, 0, where('districtId', '==', filters.districtId));
  }
  if (startAfterDoc) {
    constraints.push(startAfter(startAfterDoc));
  }

  const snap = await getDocs(query(collection(db, USERS_COL), ...constraints));
  const docs = snap.docs;
  const hasMore = docs.length > pageSize;
  const raw = docs.slice(0, pageSize).map(d => ({ uid: d.id, ...d.data() } as UserProfile));

  // Batch count to avoid N+1 — count members per registeredBy in one go
  const uids = raw.map(u => u.uid);
  const memberCounts = await batchCountMembers(uids);
  const verifiedCounts = await batchCountVerified(uids);

  const data: KaderProfile[] = raw.map((u) => ({
    ...u,
    level: getLevelFromXP(u.xp || 0),
    districtName: u.districtId ? getDistrictName(u.districtId) : undefined,
    villageName: u.villageId ? getVillageName(u.districtId || '', u.villageId) : undefined,
    memberCount: memberCounts[u.uid] || 0,
    verifiedCount: verifiedCounts[u.uid] || 0,
  }));

  return {
    data,
    hasNextPage: hasMore,
    lastDoc: hasMore ? docs[pageSize - 1] : (docs.length > 0 ? docs[docs.length - 1] : null),
  };
}

async function batchCountMembers(uids: string[]): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  if (uids.length === 0) return result;
  // Firestore 'in' supports max 30 items
  const chunks: string[][] = [];
  for (let i = 0; i < uids.length; i += 30) chunks.push(uids.slice(i, i + 30));
  await Promise.all(chunks.map(async (chunk) => {
    const snap = await getDocs(query(collection(db, MEMBERS_COL), where('registeredBy', 'in', chunk)));
    snap.docs.forEach(d => {
      const rb = d.data().registeredBy as string;
      result[rb] = (result[rb] || 0) + 1;
    });
  }));
  return result;
}

async function batchCountVerified(uids: string[]): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  if (uids.length === 0) return result;
  const chunks: string[][] = [];
  for (let i = 0; i < uids.length; i += 30) chunks.push(uids.slice(i, i + 30));
  await Promise.all(chunks.map(async (chunk) => {
    const snap = await getDocs(query(
      collection(db, MEMBERS_COL),
      where('registeredBy', 'in', chunk),
      where('verificationStatus', '==', 'verified'),
    ));
    snap.docs.forEach(d => {
      const rb = d.data().registeredBy as string;
      result[rb] = (result[rb] || 0) + 1;
    });
  }));
  return result;
}

export async function getCadreDetail(uid: string): Promise<KaderProfile | null> {
  const snap = await getDoc(doc(db, USERS_COL, uid));
  if (!snap.exists()) return null;
  const u = { uid: snap.id, ...snap.data() } as UserProfile;

  const memberCounts = await batchCountMembers([uid]);
  const verifiedCounts = await batchCountVerified([uid]);
  const targets = await getKaderTargets(uid);
  const trainingHistory = await getTrainingHistory(uid);

  return {
    ...u,
    level: getLevelFromXP(u.xp || 0),
    districtName: u.districtId ? getDistrictName(u.districtId) : undefined,
    villageName: u.villageId ? getVillageName(u.districtId || '', u.villageId) : undefined,
    memberCount: memberCounts[uid] || 0,
    verifiedCount: verifiedCounts[uid] || 0,
    targets,
    trainingHistory,
  };
}

export async function getCadreTopPerformers(limitCount = 10): Promise<KaderProfile[]> {
  const snap = await getDocs(query(
    collection(db, USERS_COL),
    where('role', 'in', ['kader', 'admin_desa', 'admin_kecamatan']),
    orderBy('xp', 'desc'),
    limit(limitCount),
  ));
  const raw = snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
  const uids = raw.map(u => u.uid);
  const memberCounts = await batchCountMembers(uids);
  const verifiedCounts = await batchCountVerified(uids);

  return raw.map(u => ({
    ...u,
    level: getLevelFromXP(u.xp || 0),
    districtName: u.districtId ? getDistrictName(u.districtId) : undefined,
    memberCount: memberCounts[u.uid] || 0,
    verifiedCount: verifiedCounts[u.uid] || 0,
  }));
}

export async function updateCadreXP(userId: string, xpToAdd: number, reason: string, adminUserId: string): Promise<void> {
  const snap = await getDoc(doc(db, USERS_COL, userId));
  if (!snap.exists()) return;
  const current = (snap.data().xp as number) || 0;
  const newXP = current + xpToAdd;
  await updateDoc(doc(db, USERS_COL, userId), {
    xp: newXP,
    level: getLevelFromXP(newXP),
    updatedAt: Date.now(),
  });
  await logActivity({
    userId: adminUserId,
    action: `menambahkan ${xpToAdd} XP ke ${snap.data().displayName || userId}`,
    targetType: 'kader',
    targetId: userId,
    metadata: { reason, xpAdded: xpToAdd, totalXP: newXP },
  });
  await logAudit({
    userId: adminUserId,
    action: 'update_xp',
    targetType: 'kader',
    targetId: userId,
    metadata: { reason, xpAdded: xpToAdd, totalXP: newXP },
  });
}

export async function getCadreStats() {
  const snap = await getDocs(query(
    collection(db, USERS_COL),
    where('role', 'in', ['kader', 'admin_desa', 'admin_kecamatan']),
  ));
  let totalXP = 0;
  const levelDist: Record<number, number> = {};
  snap.docs.forEach(d => {
    const xp = (d.data().xp as number) || 0;
    totalXP += xp;
    const lvl = getLevelFromXP(xp);
    levelDist[lvl] = (levelDist[lvl] || 0) + 1;
  });
  const avgLevel = snap.size > 0
    ? snap.docs.reduce((s, d) => s + getLevelFromXP((d.data().xp as number) || 0), 0) / snap.size
    : 0;
  const levelDistribution = Object.entries(levelDist)
    .map(([level, count]) => ({
      level: Number(level),
      count,
      label: `Level ${level}`,
    }))
    .sort((a, b) => a.level - b.level);
  return {
    totalCadres: snap.size,
    totalXP,
    avgLevel: Math.round(avgLevel * 10) / 10,
    levelDistribution,
  };
}

// --- Kader Targets ---

export async function getKaderTargets(userId: string): Promise<KaderTarget[]> {
  const snap = await getDocs(query(
    collection(db, TARGETS_COL),
    where('userId', '==', userId),
    orderBy('period', 'desc'),
  ));
  return snap.docs.map(d => ({ targetId: d.id, ...d.data() } as KaderTarget));
}

export async function createKaderTarget(
  data: Omit<KaderTarget, 'targetId' | 'createdAt' | 'updatedAt' | 'achievedMembers' | 'achievedVerified'>,
  adminUserId: string,
): Promise<string> {
  const now = Date.now();
  const ref = await addDoc(collection(db, TARGETS_COL), {
    ...data,
    achievedMembers: 0,
    achievedVerified: 0,
    createdAt: now,
    updatedAt: now,
  });
  await logActivity({
    userId: adminUserId,
    action: 'menetapkan target kader',
    targetType: 'kader_target',
    targetId: ref.id,
    metadata: { userId: data.userId, period: data.period, targetMembers: data.targetMembers },
  });
  await logAudit({
    userId: adminUserId,
    action: 'create',
    targetType: 'kader_target',
    targetId: ref.id,
    metadata: { userId: data.userId, period: data.period },
  });
  return ref.id;
}

export async function updateKaderTarget(
  targetId: string,
  data: Partial<KaderTarget>,
  adminUserId: string,
): Promise<void> {
  await updateDoc(doc(db, TARGETS_COL, targetId), {
    ...data,
    updatedAt: Date.now(),
  });
  await logAudit({
    userId: adminUserId,
    action: 'update',
    targetType: 'kader_target',
    targetId,
    metadata: { updatedFields: Object.keys(data) },
  });
}

export async function deleteKaderTarget(targetId: string, adminUserId: string): Promise<void> {
  await deleteDoc(doc(db, TARGETS_COL, targetId));
  await logAudit({
    userId: adminUserId,
    action: 'delete',
    targetType: 'kader_target',
    targetId,
  });
}

// --- Training Records ---

export async function getTrainingHistory(userId: string): Promise<TrainingRecord[]> {
  const snap = await getDocs(query(
    collection(db, TRAINING_COL),
    where('userId', '==', userId),
    orderBy('completedAt', 'desc'),
  ));
  return snap.docs.map(d => ({ trainingId: d.id, ...d.data() } as TrainingRecord));
}

export function getXPProgress(xp: number, level: number) {
  return getXPForNextLevel(level);
}

export function getLevelTitle(level: number): string {
  if (level >= 18) return 'Pemimpin Utama';
  if (level >= 15) return 'Penggerak Senior';
  if (level >= 12) return 'Penggerak Mahir';
  if (level >= 9) return 'Penggerak';
  if (level >= 6) return 'Kader Terampil';
  if (level >= 3) return 'Kader Muda';
  return 'Kader Pemula';
}

export function getMaxLevel(): number {
  return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1].level;
}
