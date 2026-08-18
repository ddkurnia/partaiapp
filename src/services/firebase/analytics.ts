import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface LogEntry {
  userId: string;
  action: string;
  targetType: string;
  targetId?: string;
  districtId?: string;
  villageId?: string;
  metadata?: Record<string, unknown>;
}

export async function logActivity(entry: LogEntry) {
  try {
    await addDoc(collection(db, 'activity_logs'), {
      ...entry,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

export async function logAudit(entry: LogEntry) {
  try {
    await addDoc(collection(db, 'audit_logs'), {
      ...entry,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Failed to log audit:', error);
  }
}
