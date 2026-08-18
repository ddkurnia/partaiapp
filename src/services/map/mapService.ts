import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface DistrictMapStats {
  districtId: string;
  total: number;
  verified: number;
  active: number;
  male: number;
  female: number;
  validPercent: number;
}

export async function getDistrictStats(): Promise<DistrictMapStats[]> {
  const snap = await getDocs(collection(db, 'members'));
  const map: Record<string, DistrictMapStats> = {};

  snap.docs.forEach(d => {
    const m = d.data();
    const dk = m.districtId || 'unknown';
    if (!map[dk]) map[dk] = { districtId: dk, total: 0, verified: 0, active: 0, male: 0, female: 0, validPercent: 0 };
    const s = map[dk];
    s.total++;
    if (m.verificationStatus === 'verified') s.verified++;
    if (m.status === 'active') s.active++;
    if (m.gender === 'L') s.male++; else s.female++;
  });

  Object.values(map).forEach(s => {
    s.validPercent = s.total > 0 ? Math.round(s.verified / s.total * 100) : 0;
  });

  return Object.values(map);
}

export async function getVillageStats(districtId: string) {
  const snap = await getDocs(query(collection(db, 'members'), where('districtId', '==', districtId)));
  const map: Record<string, { villageId: string; total: number; verified: number }> = {};

  snap.docs.forEach(d => {
    const m = d.data();
    const vk = m.villageId || 'unknown';
    if (!map[vk]) map[vk] = { villageId: vk, total: 0, verified: 0 };
    map[vk].total++;
    if (m.verificationStatus === 'verified') map[vk].verified++;
  });

  return Object.values(map);
}