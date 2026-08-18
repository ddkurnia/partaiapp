import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getDoc,
  type DocumentSnapshot,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Member } from '@/types';
import { hashString, normalizeText, maskNIK } from '@/utils/permissions';
import { logActivity, logAudit } from '@/services/firebase/analytics';

const COLLECTION = 'members';

export interface MemberFilters {
  districtId?: string;
  villageId?: string;
  status?: Member['status'];
  verificationStatus?: Member['verificationStatus'];
  gender?: Member['gender'];
  search?: string;
}

export interface DuplicateCheck {
  isDuplicate: boolean;
  confidence: number;
  matches: Partial<Member>[];
  fields: { name: boolean; birthDate: boolean; districtId: boolean; nikHash: boolean };
}

export async function checkDuplicate(memberData: {
  name: string;
  nik: string;
  birthDate: string;
  districtId: string;
  villageId?: string;
}): Promise<DuplicateCheck> {
  const nikHash = hashString(memberData.nik.trim());
  const normalizedName = normalizeText(memberData.name);
  const matches: Partial<Member>[] = [];

  // NIK hash exact match
  const nikQuery = query(collection(db, COLLECTION), where('nikHash', '==', nikHash), limit(5));
  const nikSnap = await getDocs(nikQuery);
  nikSnap.forEach(d => matches.push({ memberId: d.id, ...d.data() } as Partial<Member>));

  // Name + district + birthDate fuzzy match
  if (matches.length === 0) {
    const nameQuery = query(
      collection(db, COLLECTION),
      where('districtId', '==', memberData.districtId),
      orderBy('name'),
      limit(50),
    );
    const nameSnap = await getDocs(nameQuery);
    nameSnap.forEach(d => {
      const data = d.data() as Member;
      if (normalizeText(data.name).includes(normalizedName) || normalizedName.includes(normalizeText(data.name))) {
        if (data.birthDate === memberData.birthDate) {
          matches.push({ ...data, memberId: d.id } as Partial<Member>);
        }
      }
    });
  }

  if (matches.length === 0) {
    return { isDuplicate: false, confidence: 0, matches: [], fields: { name: false, birthDate: false, districtId: false, nikHash: false } };
  }

  const best = matches[0];
  let confidence = 0;
  const fields = { name: false, birthDate: false, districtId: false, nikHash: false };

  if (best.nikHash === nikHash) { confidence += 50; fields.nikHash = true; }
  if (normalizeText(best.name || '') === normalizedName) { confidence += 25; fields.name = true; }
  if (best.birthDate === memberData.birthDate) { confidence += 15; fields.birthDate = true; }
  if (best.districtId === memberData.districtId) { confidence += 10; fields.districtId = true; }

  return {
    isDuplicate: confidence >= 40,
    confidence,
    matches: matches.map(m => ({
      ...m,
      nikMasked: m.nikMasked || '**************',
    })),
    fields,
  };
}

export async function createMember(
  data: Omit<Member, 'memberId' | 'createdAt' | 'updatedAt' | 'registeredBy'>,
  userId: string,
) {
  const memberData = {
    ...data,
    nikHash: hashString(data.nikHash),
    nikMasked: maskNIK(data.nikHash),
    registeredBy: userId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const ref = await addDoc(collection(db, COLLECTION), memberData);
  await logActivity({
    userId, action: 'menambahkan anggota baru',
    targetType: 'member', targetId: ref.id,
    districtId: data.districtId, villageId: data.villageId,
  });
  await logAudit({
    userId, action: 'create',
    targetType: 'member', targetId: ref.id,
    districtId: data.districtId, villageId: data.villageId,
    metadata: { memberName: data.name },
  });
  return ref.id;
}

export async function updateMember(memberId: string, data: Partial<Member>, userId: string) {
  await updateDoc(doc(db, COLLECTION, memberId), { ...data, updatedAt: Date.now() });
  await logActivity({
    userId, action: 'memperbarui data anggota',
    targetType: 'member', targetId: memberId,
    districtId: data.districtId, villageId: data.villageId,
  });
  await logAudit({
    userId, action: 'update',
    targetType: 'member', targetId: memberId,
    metadata: { updatedFields: Object.keys(data) },
  });
}

export async function deleteMember(memberId: string, userId: string) {
  const snap = await getDoc(doc(db, COLLECTION, memberId));
  const d = snap.exists() ? (snap.data() as Member) : null;
  await deleteDoc(doc(db, COLLECTION, memberId));
  await logAudit({
    userId, action: 'delete',
    targetType: 'member', targetId: memberId,
    districtId: d?.districtId, villageId: d?.villageId,
    metadata: { memberName: d?.name },
  });
}

export async function getMember(memberId: string): Promise<Member | null> {
  const snap = await getDoc(doc(db, COLLECTION, memberId));
  if (!snap.exists()) return null;
  return { memberId: snap.id, ...snap.data() } as Member;
}

export async function getMembersPaginated({
  filters = {},
  pageSize = 20,
  startAfterDoc = null,
}: {
  filters?: MemberFilters;
  pageSize?: number;
  startAfterDoc?: DocumentSnapshot | null;
} = {}): Promise<MemberListResult> {
  const constraints: QueryConstraint[] = [];

  if (filters.districtId) constraints.push(where('districtId', '==', filters.districtId));
  if (filters.villageId) constraints.push(where('villageId', '==', filters.villageId));
  if (filters.status) constraints.push(where('status', '==', filters.status));
  if (filters.verificationStatus) constraints.push(where('verificationStatus', '==', filters.verificationStatus));
  if (filters.gender) constraints.push(where('gender', '==', filters.gender));

  constraints.push(orderBy('createdAt', 'desc'));
  constraints.push(limit(pageSize + 1));

  if (startAfterDoc) {
    constraints.push(startAfter(startAfterDoc));
  }

  const q = query(collection(db, COLLECTION), ...constraints);
  const snap = await getDocs(q);
  const docs = snap.docs;
  const hasMore = docs.length > pageSize;
  const data = docs.slice(0, pageSize).map(d => ({
    memberId: d.id, ...d.data(),
  } as Member));
  const lastDoc = hasMore ? docs[pageSize - 1] : (docs.length > 0 ? docs[docs.length - 1] : null);

  return { data, total: data.length, page: 1, pageSize, hasNextPage: hasMore, lastDoc };
}

export interface MemberListResult {
  data: Member[];
  total: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  lastDoc: DocumentSnapshot | null;
}

export async function searchMembers(searchTerm: string, pageSize = 20): Promise<Member[]> {
  if (!searchTerm || searchTerm.length < 2) return [];
  const term = searchTerm.toLowerCase().trim();
  const q = query(collection(db, COLLECTION), orderBy('name'), limit(100));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ memberId: d.id, ...d.data() } as Member))
    .filter(m =>
      m.name.toLowerCase().includes(term) ||
      (m.phone && m.phone.includes(term)) ||
      m.nikMasked.endsWith(term),
    )
    .slice(0, pageSize);
}