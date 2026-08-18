import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  type DocumentSnapshot,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function getDocument<T>(collectionName: string, docId: string): Promise<T | null> {
  const snap = await getDoc(doc(db, collectionName, docId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as T;
}

export async function getDocuments<T>(
  collectionName: string,
  constraints: QueryConstraint[] = [],
): Promise<T[]> {
  const q = query(collection(db, collectionName), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as T));
}

export async function addDocument(collectionName: string, data: Record<string, unknown>) {
  const ref = await addDoc(collection(db, collectionName), data);
  return ref.id;
}

export async function updateDocument(collectionName: string, docId: string, data: Record<string, unknown>) {
  await updateDoc(doc(db, collectionName, docId), data);
}

export async function deleteDocument(collectionName: string, docId: string) {
  await deleteDoc(doc(db, collectionName, docId));
}

export async function getPaginatedDocuments<T>(
  collectionName: string,
  {
    constraints = [],
    pageSize = 20,
    startAfterDoc = null,
  }: {
    constraints?: QueryConstraint[];
    pageSize?: number;
    startAfterDoc?: DocumentSnapshot | null;
  } = {},
): Promise<{ data: T[]; lastDoc: DocumentSnapshot | null; hasMore: boolean }> {
  const allConstraints = [
    ...constraints,
    orderBy('createdAt', 'desc'),
    limit(pageSize + 1),
  ];

  if (startAfterDoc) {
    allConstraints.push(startAfter(startAfterDoc));
  }

  const q = query(collection(db, collectionName), ...allConstraints);
  const snap = await getDocs(q);
  const docs = snap.docs;
  const hasMore = docs.length > pageSize;
  const data = docs.slice(0, pageSize).map(d => ({ id: d.id, ...d.data() } as T));
  const lastDoc = hasMore ? docs[pageSize - 1] : docs[docs.length - 1] ?? null;

  return { data, lastDoc, hasMore };
}

export { collection, doc, query, where, orderBy, limit, startAfter, serverTimestamp } from 'firebase/firestore';
