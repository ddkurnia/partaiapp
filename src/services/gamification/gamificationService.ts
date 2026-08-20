import {
  collection, doc, addDoc, updateDoc, getDoc, getDocs, query,
  where, orderBy, limit, deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getLevelFromXP } from '@/constants/roles';
import { BADGES, XP_REWARDS, type XPRewardKey } from '@/constants/gamification';
import { getDistrictName } from '@/constants/regions';
import { logActivity, logAudit } from '@/services/firebase/analytics';
import type { Quiz, QuizResult, Reward, RewardRedemption, Notification, LeaderboardEntry, BadgeDefinition } from '@/types';

const QUIZ_COL = 'quizzes';
const QUIZ_RESULTS_COL = 'quiz_results';
const REWARDS_COL = 'rewards';
const REDEMPTIONS_COL = 'reward_redemptions';
const NOTIFICATIONS_COL = 'notifications';
const USERS_COL = 'users';
const MEMBERS_COL = 'members';

// =======================================
// XP System
// =======================================

export async function addXP(
  userId: string,
  amount: number,
  reason: string,
): Promise<{ newXP: number; newLevel: number; leveledUp: boolean }> {
  const snap = await getDoc(doc(db, USERS_COL, userId));
  if (!snap.exists()) return { newXP: 0, newLevel: 1, leveledUp: false };

  const currentXP = (snap.data().xp as number) || 0;
  const currentLevel = getLevelFromXP(currentXP);
  const newXP = currentXP + amount;
  const newLevel = getLevelFromXP(newXP);
  const leveledUp = newLevel > currentLevel;

  const updateData: Record<string, unknown> = {
    xp: newXP,
    level: newLevel,
    updatedAt: Date.now(),
  };

  const currentBadges: string[] = snap.data().badges || [];
  const memberCount = await getUserMemberCount(userId);
  const quizCount = await getUserQuizCount(userId);
  const newBadges = checkNewBadges(currentBadges, newXP, memberCount, quizCount);
  if (newBadges.length > 0) {
    updateData.badges = [...currentBadges, ...newBadges.map(b => b.id)];
  }

  await updateDoc(doc(db, USERS_COL, userId), updateData);

  await logActivity({
    userId, action: `mendapatkan ${amount} XP (${reason})`,
    targetType: 'xp', metadata: { reason, xpAdded: amount, totalXP: newXP, newLevel },
  });

  if (leveledUp) {
    await createNotification(userId, {
      title: 'Naik Level!',
      body: `Selamat! Anda telah naik ke Level ${newLevel}. Terus semangat!`,
      type: 'level_up',
      metadata: { oldLevel: currentLevel, newLevel, xp: newXP },
    });
  }

  for (const badge of newBadges) {
    await createNotification(userId, {
      title: 'Badge Baru!',
      body: `Anda mendapatkan badge "${badge.title}": ${badge.description}`,
      type: 'reward',
      metadata: { badgeId: badge.id },
    });
  }

  return { newXP, newLevel, leveledUp };
}

async function getUserMemberCount(userId: string): Promise<number> {
  const snap = await getDocs(query(
    collection(db, MEMBERS_COL),
    where('registeredBy', '==', userId),
  ));
  return snap.size;
}

async function getUserQuizCount(userId: string): Promise<number> {
  const snap = await getDocs(query(
    collection(db, QUIZ_RESULTS_COL),
    where('userId', '==', userId),
  ));
  return snap.size;
}

function checkNewBadges(currentBadges: string[], xp: number, memberCount: number, quizCount: number): BadgeDefinition[] {
  return BADGES.filter(badge => {
    if (currentBadges.includes(badge.id)) return false;
    if (badge.condition === 'xp_threshold' && badge.xpThreshold && xp >= badge.xpThreshold) return true;
    if (badge.condition === 'member_count' && badge.memberCountThreshold && memberCount >= badge.memberCountThreshold) return true;
    if (badge.condition === 'quiz_count' && badge.quizCountThreshold && quizCount >= badge.quizCountThreshold) return true;
    return false;
  });
}

export function getXPReward(key: XPRewardKey): number {
  return XP_REWARDS[key];
}

// =======================================
// Quiz Service
// =======================================

export async function getActiveQuizzes(): Promise<Quiz[]> {
  const snap = await getDocs(query(
    collection(db, QUIZ_COL),
    where('active', '==', true),
    orderBy('createdAt', 'desc'),
  ));
  return snap.docs.map(d => ({ quizId: d.id, ...d.data() } as Quiz));
}

export async function getAllQuizzes(): Promise<Quiz[]> {
  const snap = await getDocs(query(collection(db, QUIZ_COL), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => ({ quizId: d.id, ...d.data() } as Quiz));
}

export async function getQuiz(quizId: string): Promise<Quiz | null> {
  const snap = await getDoc(doc(db, QUIZ_COL, quizId));
  if (!snap.exists()) return null;
  return { quizId: snap.id, ...snap.data() } as Quiz;
}

export async function createQuiz(
  data: Omit<Quiz, 'quizId' | 'createdAt' | 'updatedAt'>,
  userId: string,
): Promise<string> {
  const now = Date.now();
  const ref = await addDoc(collection(db, QUIZ_COL), { ...data, createdAt: now, updatedAt: now });
  await logAudit({
    userId, action: 'create', targetType: 'quiz', targetId: ref.id,
    metadata: { title: data.title, category: data.category },
  });
  return ref.id;
}

export async function updateQuiz(quizId: string, data: Partial<Quiz>, userId: string): Promise<void> {
  await updateDoc(doc(db, QUIZ_COL, quizId), { ...data, updatedAt: Date.now() });
  await logAudit({
    userId, action: 'update', targetType: 'quiz', targetId: quizId,
    metadata: { updatedFields: Object.keys(data) },
  });
}

export async function deleteQuiz(quizId: string, userId: string): Promise<void> {
  await deleteDoc(doc(db, QUIZ_COL, quizId));
  await logAudit({ userId, action: 'delete', targetType: 'quiz', targetId: quizId });
}

export async function getQuizAttemptCount(userId: string, quizId: string): Promise<number> {
  const snap = await getDocs(query(
    collection(db, QUIZ_RESULTS_COL),
    where('userId', '==', userId),
    where('quizId', '==', quizId),
  ));
  return snap.size;
}

export async function submitQuizResult(
  quiz: Quiz,
  userId: string,
  answers: number[],
  startedAt: number,
): Promise<{ result: QuizResult; xpGained: number; leveledUp: boolean }> {
  let score = 0;
  quiz.questions.forEach((q, idx) => {
    if (answers[idx] === q.correctAnswer) score++;
  });

  const maxScore = quiz.questions.length;
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const passed = percentage >= quiz.passingScore;
  const xpGained = passed ? quiz.xpReward : Math.round(quiz.xpReward * 0.3);
  const completedAt = Date.now();

  const resultData = {
    quizId: quiz.quizId, userId, score, maxScore,
    percentage, passed, xpEarned: xpGained, answers,
    startedAt, completedAt,
  };

  const ref = await addDoc(collection(db, QUIZ_RESULTS_COL), resultData);
  const { leveledUp } = await addXP(userId, xpGained, passed ? 'Lulus Kuis' : 'Menyelesaikan Kuis');

  await createNotification(userId, {
    title: passed ? 'Kuis Berhasil!' : 'Kuis Selesai',
    body: `${quiz.title}: ${score}/${maxScore} (${percentage}%). ${passed ? `+${xpGained} XP` : 'Belum lulus, coba lagi!'}`,
    type: passed ? 'success' : 'info',
    metadata: { quizId: quiz.quizId, score, percentage, passed, xpEarned: xpGained },
  });

  return {
    result: { resultId: ref.id, ...resultData },
    xpGained, leveledUp,
  };
}

export async function getQuizResults(userId: string): Promise<QuizResult[]> {
  const snap = await getDocs(query(
    collection(db, QUIZ_RESULTS_COL),
    where('userId', '==', userId),
    orderBy('completedAt', 'desc'),
    limit(50),
  ));
  return snap.docs.map(d => ({ resultId: d.id, ...d.data() } as QuizResult));
}

// =======================================
// Rewards Service
// =======================================

export async function getActiveRewards(): Promise<Reward[]> {
  const snap = await getDocs(query(
    collection(db, REWARDS_COL),
    where('active', '==', true),
    orderBy('xpCost', 'asc'),
  ));
  return snap.docs.map(d => ({ rewardId: d.id, ...d.data() } as Reward));
}

export async function getAllRewards(): Promise<Reward[]> {
  const snap = await getDocs(query(collection(db, REWARDS_COL), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => ({ rewardId: d.id, ...d.data() } as Reward));
}

export async function createReward(
  data: Omit<Reward, 'rewardId' | 'createdAt' | 'updatedAt'>,
  userId: string,
): Promise<string> {
  const now = Date.now();
  const ref = await addDoc(collection(db, REWARDS_COL), { ...data, createdAt: now, updatedAt: now });
  await logAudit({ userId, action: 'create', targetType: 'reward', targetId: ref.id, metadata: { title: data.title } });
  return ref.id;
}

export async function updateReward(rewardId: string, data: Partial<Reward>, userId: string): Promise<void> {
  await updateDoc(doc(db, REWARDS_COL, rewardId), { ...data, updatedAt: Date.now() });
  await logAudit({ userId, action: 'update', targetType: 'reward', targetId: rewardId });
}

export async function deleteReward(rewardId: string, userId: string): Promise<void> {
  await deleteDoc(doc(db, REWARDS_COL, rewardId));
  await logAudit({ userId, action: 'delete', targetType: 'reward', targetId: rewardId });
}

export async function redeemReward(rewardId: string, userId: string): Promise<RewardRedemption> {
  const rewardSnap = await getDoc(doc(db, REWARDS_COL, rewardId));
  if (!rewardSnap.exists()) throw new Error('Hadiah tidak ditemukan');
  const reward = { rewardId, ...rewardSnap.data() } as Reward;

  if (!reward.active) throw new Error('Hadiah tidak tersedia');
  if (reward.stock <= 0) throw new Error('Stok hadiah habis');

  const userSnap = await getDoc(doc(db, USERS_COL, userId));
  if (!userSnap.exists()) throw new Error('Pengguna tidak ditemukan');
  const userXP = (userSnap.data().xp as number) || 0;
  if (userXP < reward.xpCost) throw new Error(`XP tidak cukup. Butuh ${reward.xpCost} XP, Anda punya ${userXP} XP`);

  const now = Date.now();
  const ref = await addDoc(collection(db, REDEMPTIONS_COL), {
    rewardId, userId, rewardTitle: reward.title, xpCost: reward.xpCost,
    status: 'pending', requestedAt: now,
  });

  await updateDoc(doc(db, USERS_COL, userId), {
    xp: userXP - reward.xpCost,
    level: getLevelFromXP(userXP - reward.xpCost),
    updatedAt: now,
  });
  await updateDoc(doc(db, REWARDS_COL, rewardId), { stock: reward.stock - 1, updatedAt: now });

  await createNotification(userId, {
    title: 'Penukaran Diajukan',
    body: `Permintaan penukaran "${reward.title}" (${reward.xpCost} XP) sedang diproses.`,
    type: 'reward',
    metadata: { redemptionId: ref.id, rewardId, xpCost: reward.xpCost },
  });

  return { redemptionId: ref.id, rewardId, userId, rewardTitle: reward.title, xpCost: reward.xpCost, status: 'pending', requestedAt: now };
}

export async function getMyRedemptions(userId: string): Promise<RewardRedemption[]> {
  const snap = await getDocs(query(
    collection(db, REDEMPTIONS_COL),
    where('userId', '==', userId),
    orderBy('requestedAt', 'desc'),
    limit(50),
  ));
  return snap.docs.map(d => ({ redemptionId: d.id, ...d.data() } as RewardRedemption));
}

export async function getAllRedemptions(): Promise<RewardRedemption[]> {
  const snap = await getDocs(query(
    collection(db, REDEMPTIONS_COL),
    orderBy('requestedAt', 'desc'),
    limit(100),
  ));
  return snap.docs.map(d => ({ redemptionId: d.id, ...d.data() } as RewardRedemption));
}

export async function processRedemption(
  redemptionId: string, status: 'approved' | 'rejected' | 'fulfilled',
  adminUserId: string, note?: string,
): Promise<void> {
  const updateData: Record<string, unknown> = {
    status, processedAt: Date.now(), processedBy: adminUserId,
  };
  if (note) updateData.note = note;

  if (status === 'rejected') {
    const snap = await getDoc(doc(db, REDEMPTIONS_COL, redemptionId));
    if (snap.exists()) {
      const red = snap.data() as RewardRedemption;
      const userSnap = await getDoc(doc(db, USERS_COL, red.userId));
      if (userSnap.exists()) {
        const currentXP = (userSnap.data().xp as number) || 0;
        const newXP = currentXP + red.xpCost;
        await updateDoc(doc(db, USERS_COL, red.userId), {
          xp: newXP, level: getLevelFromXP(newXP), updatedAt: Date.now(),
        });
      }
      const rewardSnap = await getDoc(doc(db, REWARDS_COL, red.rewardId));
      if (rewardSnap.exists()) {
        await updateDoc(doc(db, REWARDS_COL, red.rewardId), {
          stock: ((rewardSnap.data().stock as number) || 0) + 1, updatedAt: Date.now(),
        });
      }
    }
  }

  await updateDoc(doc(db, REDEMPTIONS_COL, redemptionId), updateData);
  await logAudit({
    userId: adminUserId, action: `redemption_${status}`,
    targetType: 'reward_redemption', targetId: redemptionId,
    metadata: { status, note },
  });
}

// =======================================
// Leaderboard
// =======================================

export async function getLeaderboard(limitCount = 50): Promise<LeaderboardEntry[]> {
  const snap = await getDocs(query(
    collection(db, USERS_COL),
    where('role', 'in', ['kader', 'admin_desa', 'admin_kecamatan']),
    orderBy('xp', 'desc'),
    limit(limitCount),
  ));

  const raw = snap.docs.map(d => ({ uid: d.id, ...d.data() })) as { uid: string; displayName?: string; xp?: number; districtId?: string }[];
  const uids = raw.map(u => u.uid);
  const memberCounts = await batchCount(uids);

  return raw.map((u, idx) => ({
    uid: u.uid,
    displayName: u.displayName || 'Anonim',
    xp: u.xp || 0,
    level: getLevelFromXP(u.xp || 0),
    memberCount: memberCounts[u.uid] || 0,
    districtName: u.districtId ? getDistrictName(u.districtId) : undefined,
    rank: idx + 1,
  }));
}

async function batchCount(uids: string[]): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  if (!uids.length) return result;
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

// =======================================
// Notifications
// =======================================

async function createNotification(
  userId: string,
  data: { title: string; body: string; type: Notification['type']; metadata?: Record<string, unknown> },
): Promise<string> {
  const ref = await addDoc(collection(db, NOTIFICATIONS_COL), {
    userId, ...data, read: false, createdAt: Date.now(),
  });
  return ref.id;
}

export async function getNotifications(userId: string, limitCount = 30): Promise<Notification[]> {
  const snap = await getDocs(query(
    collection(db, NOTIFICATIONS_COL),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount),
  ));
  return snap.docs.map(d => ({ notificationId: d.id, ...d.data() } as Notification));
}

export async function getUnreadCount(userId: string): Promise<number> {
  const snap = await getDocs(query(
    collection(db, NOTIFICATIONS_COL),
    where('userId', '==', userId),
    where('read', '==', false),
  ));
  return snap.size;
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await updateDoc(doc(db, NOTIFICATIONS_COL, notificationId), { read: true });
}

export async function markAllRead(userId: string): Promise<void> {
  const snap = await getDocs(query(
    collection(db, NOTIFICATIONS_COL),
    where('userId', '==', userId),
    where('read', '==', false),
  ));
  await Promise.all(snap.docs.map(d => updateDoc(doc(db, NOTIFICATIONS_COL, d.id), { read: true })));
}

// =======================================
// User Stats
// =======================================

export interface UserGamificationStats {
  totalQuizTaken: number;
  totalQuizPassed: number;
  totalRedemptions: number;
  pendingRedemptions: number;
  badges: string[];
}

export async function getUserGamificationStats(userId: string): Promise<UserGamificationStats> {
  const [quizSnap, redemptionSnap, userSnap] = await Promise.all([
    getDocs(query(collection(db, QUIZ_RESULTS_COL), where('userId', '==', userId))),
    getDocs(query(collection(db, REDEMPTIONS_COL), where('userId', '==', userId))),
    getDoc(doc(db, USERS_COL, userId)),
  ]);

  let totalQuizPassed = 0;
  let pendingRedemptions = 0;
  quizSnap.docs.forEach(d => { if (d.data().passed) totalQuizPassed++; });
  redemptionSnap.docs.forEach(d => { if (d.data().status === 'pending') pendingRedemptions++; });

  return {
    totalQuizTaken: quizSnap.size,
    totalQuizPassed,
    totalRedemptions: redemptionSnap.size,
    pendingRedemptions,
    badges: userSnap.exists() ? ((userSnap.data().badges as string[]) || []) : [],
  };
}
