import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getDistrictName, getVillageName } from '@/constants/regions';

export interface DistrictMapStats {
  districtId: string;
  districtName: string;
  total: number;
  verified: number;
  active: number;
  inactive: number;
  suspended: number;
  male: number;
  female: number;
  validPercent: number;
  malePercent: number;
  femalePercent: number;
  kaderCount: number;
  thisMonth: number;
  lastMonth: number;
  growthPercent: number;
}

export interface VillageMapStats {
  villageId: string;
  villageName: string;
  total: number;
  verified: number;
  validPercent: number;
}

export interface DistrictComparison {
  districtId: string;
  districtName: string;
  total: number;
  verified: number;
  validPercent: number;
  kaderCount: number;
  growthPercent: number;
  rank: number;
}

export async function getDistrictStats(): Promise<DistrictMapStats[]> {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();

  const [memberSnap, userSnap] = await Promise.all([
    getDocs(collection(db, 'members')),
    getDocs(query(
      collection(db, 'users'),
      where('role', 'in', ['kader', 'admin_desa', 'admin_kecamatan']),
    )),
  ]);

  const kaderPerDistrict: Record<string, number> = {};
  userSnap.docs.forEach(d => {
    const u = d.data();
    const dk = u.districtId || 'unknown';
    kaderPerDistrict[dk] = (kaderPerDistrict[dk] || 0) + 1;
  });

  const map: Record<string, DistrictMapStats> = {};

  memberSnap.docs.forEach(d => {
    const m = d.data();
    const dk = m.districtId || 'unknown';
    if (!map[dk]) {
      map[dk] = {
        districtId: dk,
        districtName: getDistrictName(dk),
        total: 0, verified: 0, active: 0, inactive: 0, suspended: 0,
        male: 0, female: 0, validPercent: 0, malePercent: 0, femalePercent: 0,
        kaderCount: kaderPerDistrict[dk] || 0,
        thisMonth: 0, lastMonth: 0, growthPercent: 0,
      };
    }
    const s = map[dk];
    s.total++;
    if (m.verificationStatus === 'verified') s.verified++;
    if (m.status === 'active') s.active++;
    if (m.status === 'inactive') s.inactive++;
    if (m.status === 'suspended') s.suspended++;
    if (m.gender === 'L') s.male++; else s.female++;
    if (m.createdAt) {
      if (m.createdAt >= thisMonthStart) s.thisMonth++;
      else if (m.createdAt >= lastMonthStart) s.lastMonth++;
    }
  });

  Object.values(map).forEach(s => {
    s.validPercent = s.total > 0 ? Math.round(s.verified / s.total * 100) : 0;
    s.malePercent = s.total > 0 ? Math.round(s.male / s.total * 100) : 0;
    s.femalePercent = s.total > 0 ? Math.round(s.female / s.total * 100) : 0;
    s.growthPercent = s.lastMonth > 0 ? Math.round(((s.thisMonth - s.lastMonth) / s.lastMonth) * 100) : (s.thisMonth > 0 ? 100 : 0);
  });

  return Object.values(map);
}

export async function getVillageStats(districtId: string): Promise<VillageMapStats[]> {
  const snap = await getDocs(query(collection(db, 'members'), where('districtId', '==', districtId)));
  const map: Record<string, VillageMapStats> = {};

  snap.docs.forEach(d => {
    const m = d.data();
    const vk = m.villageId || 'unknown';
    if (!map[vk]) map[vk] = { villageId: vk, villageName: getVillageName(districtId, vk), total: 0, verified: 0, validPercent: 0 };
    map[vk].total++;
    if (m.verificationStatus === 'verified') map[vk].verified++;
  });

  Object.values(map).forEach(s => {
    s.validPercent = s.total > 0 ? Math.round(s.verified / s.total * 100) : 0;
  });

  return Object.values(map);
}

export async function getDistrictComparison(): Promise<DistrictComparison[]> {
  const stats = await getDistrictStats();
  return stats
    .sort((a, b) => b.total - a.total)
    .map((s, i) => ({
      districtId: s.districtId,
      districtName: s.districtName,
      total: s.total,
      verified: s.verified,
      validPercent: s.validPercent,
      kaderCount: s.kaderCount,
      growthPercent: s.growthPercent,
      rank: i + 1,
    }));
}

export async function getKaderDensity(): Promise<{ districtId: string; districtName: string; kaderCount: number; memberPerKader: number }[]> {
  const stats = await getDistrictStats();
  return stats.map(s => ({
    districtId: s.districtId,
    districtName: s.districtName,
    kaderCount: s.kaderCount,
    memberPerKader: s.kaderCount > 0 ? Math.round(s.total / s.kaderCount) : 0,
  })).sort((a, b) => b.memberPerKader - a.memberPerKader);
}
