import { useState, useEffect, useCallback } from 'react';
import {
  collection, getDocs, query, where, orderBy, limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getDistrictOptions, getVillageOptions, getDistrictName } from '@/constants/regions';
import { Skeleton, ChartSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { getCadreTopPerformers, getLevelTitle } from '@/services/cadres/cadreService';
import type { KaderProfile } from '@/types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { BarChart3, TrendingUp, Users, ShieldCheck, UserCheck, Filter, Download, X, Trophy, Zap, Target, Star } from 'lucide-react';
import toast from 'react-hot-toast';

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const STATUS_COLORS: Record<string, string> = { active: '#10b981', inactive: '#94a3b8', suspended: '#ef4444' };

interface StatData {
  totalMembers: number;
  verified: number;
  pending: number;
  active: number;
  inactive: number;
  suspended: number;
  genderData: { name: string; value: number }[];
  statusData: { name: string; value: number; statusKey: string }[];
  districtData: { name: string; total: number; verified: number }[];
  monthlyData: { month: string; total: number; verified: number }[];
}

export default function StatisticsPage() {
  const [data, setData] = useState<StatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [districtFilter, setDistrictFilter] = useState('');
  const [villageFilter, setVillageFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [topKader, setTopKader] = useState<KaderProfile[]>([]);
  const [loadingKader, setLoadingKader] = useState(true);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const constraints: any[] = [];
      if (districtFilter) constraints.push(where('districtId', '==', districtFilter));
      if (villageFilter) constraints.push(where('villageId', '==', villageFilter));
      if (dateFrom) constraints.push(where('createdAt', '>=', new Date(dateFrom).getTime()));
      if (dateTo) constraints.push(where('createdAt', '<=', new Date(dateTo).setHours(23, 59, 59, 999)));
      constraints.push(orderBy('createdAt', 'desc'), limit(5000));
      const snap = await getDocs(query(collection(db, 'members'), ...constraints));

      let verified = 0, pending = 0, active = 0, inactive = 0, suspended = 0;
      const genderMap: Record<string, number> = {};
      const statusMap: Record<string, number> = {};
      const districtMap: Record<string, { total: number; verified: number }> = {};
      const monthlyMap: Record<string, { total: number; verified: number }> = {};

      snap.docs.forEach(d => {
        const m = d.data();
        if (m.verificationStatus === 'verified') verified++;
        if (m.verificationStatus === 'pending') pending++;
        if (m.status === 'active') active++;
        if (m.status === 'inactive') inactive++;
        if (m.status === 'suspended') suspended++;
        const gk = m.gender === 'L' ? 'Laki-laki' : 'Perempuan';
        genderMap[gk] = (genderMap[gk] || 0) + 1;
        statusMap[m.status || 'unknown'] = (statusMap[m.status || 'unknown'] || 0) + 1;
        const dk = m.districtId || 'unknown';
        if (!districtMap[dk]) districtMap[dk] = { total: 0, verified: 0 };
        districtMap[dk].total++;
        if (m.verificationStatus === 'verified') districtMap[dk].verified++;
        if (m.createdAt) {
          const dt = new Date(m.createdAt);
          const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
          if (!monthlyMap[key]) monthlyMap[key] = { total: 0, verified: 0 };
          monthlyMap[key].total++;
          if (m.verificationStatus === 'verified') monthlyMap[key].verified++;
        }
      });

      const STATUS_LABELS: Record<string, string> = { active: 'Aktif', inactive: 'Tidak Aktif', suspended: 'Ditangguhkan' };
      const genderData = Object.entries(genderMap).map(([name, value]) => ({ name, value }));
      const statusData = Object.entries(statusMap).map(([key, value]) => ({ name: STATUS_LABELS[key] || key, value, statusKey: key }));
      const districtData = Object.entries(districtMap)
        .map(([id, v]) => ({ name: getDistrictName(id), total: v.total, verified: v.verified }))
        .sort((a, b) => b.total - a.total);
      const monthlyData = Object.entries(monthlyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, v]) => {
          const [y, m] = key.split('-');
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
          return { month: `${months[parseInt(m) - 1]} ${y.slice(2)}`, total: v.total, verified: v.verified };
        });

      setData({ totalMembers: snap.size, verified, pending, active, inactive, suspended, genderData, statusData, districtData, monthlyData });
    } catch {
      toast.error('Gagal memuat statistik');
    }
    setLoading(false);
  }, [districtFilter, villageFilter, dateFrom, dateTo]);

  useEffect(() => { loadStats(); }, [loadStats]);

  useEffect(() => {
    getCadreTopPerformers(10).then(setTopKader).catch(() => {}).finally(() => setLoadingKader(false));
  }, []);

  const clearFilters = () => { setDistrictFilter(''); setVillageFilter(''); setDateFrom(''); setDateTo(''); };
  const activeFilterCount = [districtFilter, villageFilter, dateFrom, dateTo].filter(Boolean).length;

  return (
    <div className="space-y-5 pb-20 lg:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-primary">Statistik</h2>
          <p className="text-sm text-muted-foreground">Analitik data organisasi</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-primary">Filter</span>
          </div>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="text-xs text-accent hover:underline">Reset semua</button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Kecamatan</label>
            <select value={districtFilter} onChange={e => { setDistrictFilter(e.target.value); setVillageFilter(''); }} className="input-field h-10 text-sm">
              <option value="">Semua Kecamatan</option>
              {getDistrictOptions().map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Desa</label>
            <select value={villageFilter} onChange={e => setVillageFilter(e.target.value)} className="input-field h-10 text-sm" disabled={!districtFilter}>
              <option value="">Semua Desa</option>
              {getVillageOptions(districtFilter).map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Dari Tanggal</label>
            <div className="relative">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-field h-10 text-sm pr-9" />
              {dateFrom && <button onClick={() => setDateFrom('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Sampai Tanggal</label>
            <div className="relative">
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-field h-10 text-sm pr-9" />
              {dateTo && <button onClick={() => setDateTo('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">{Array.from({ length: 5 }).map((_, i) => <MiniStatSkeleton key={i} />)}</div>
          <ChartSkeleton /><ChartSkeleton />
        </div>
      ) : data ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <KpiCard icon={<Users className="w-4 h-4" />} color="text-accent" bg="bg-accent/10" value={data.totalMembers.toLocaleString('id-ID')} label="Total Anggota" />
            <KpiCard icon={<ShieldCheck className="w-4 h-4" />} color="text-emerald-500" bg="bg-emerald-500/10" value={`${data.verified.toLocaleString('id-ID')} (${data.totalMembers ? Math.round(data.verified / data.totalMembers * 100) : 0}%)`} label="Data Valid" />
            <KpiCard icon={<TrendingUp className="w-4 h-4" />} color="text-amber-500" bg="bg-amber-500/10" value={data.pending.toLocaleString('id-ID')} label="Perlu Verifikasi" />
            <KpiCard icon={<UserCheck className="w-4 h-4" />} color="text-blue-500" bg="bg-blue-500/10" value={data.active.toLocaleString('id-ID')} label="Aktif" />
            <KpiCard icon={<BarChart3 className="w-4 h-4" />} color="text-gray-500" bg="bg-gray-500/10" value={`${data.inactive.toLocaleString('id-ID')} / ${data.suspended.toLocaleString('id-ID')}`} label="Nonaktif / Susp." />
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ChartCard title="Pertumbuhan Anggota" className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '12px', fontSize: '12px' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="total" name="Total" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="verified" name="Valid" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Status Anggota">
              {data.statusData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={data.statusData} cx="50%" cy="45%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                        {data.statusData.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.statusKey] || COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => Number(v).toLocaleString('id-ID')} contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '12px', fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-3 -mt-1">
                    {data.statusData.map((item, i) => (
                      <div key={item.statusKey} className="flex items-center gap-1.5 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[item.statusKey] || COLORS[i] }} />
                        <span className="text-muted-foreground">{item.name}: <strong className="text-primary">{item.value.toLocaleString('id-ID')}</strong></span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState title="Belum ada data" />
              )}
            </ChartCard>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Distribusi Gender">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={data.genderData} cx="50%" cy="45%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                    {data.genderData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => Number(v).toLocaleString('id-ID')} contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '12px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 -mt-2">
                {data.genderData.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                    <span className="text-muted-foreground">{item.name}: <strong className="text-primary">{item.value.toLocaleString('id-ID')}</strong></span>
                  </div>
                ))}
              </div>
            </ChartCard>

            <ChartCard title="Anggota per Kecamatan">
              <ResponsiveContainer width="100%" height={Math.max(280, data.districtData.length * 40)}>
                <BarChart data={data.districtData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" width={120} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '12px', fontSize: '12px' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="total" name="Total" fill="#10b981" radius={[0, 6, 6, 0]} />
                  <Bar dataKey="verified" name="Valid" fill="#0f172a" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Kader Leaderboard */}
          <ChartCard title="Top 10 Kader" extra={
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Trophy className="w-3.5 h-3.5 text-amber-500" /> Berdasarkan XP
            </div>
          }>
            {loadingKader ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="flex gap-3"><div className="skeleton w-8 h-8 rounded-full" /><div className="flex-1 space-y-2"><div className="skeleton h-4 w-32" /><div className="skeleton h-3 w-20" /></div></div>)}</div>
            ) : topKader.length === 0 ? (
              <EmptyState title="Belum ada data kader" />
            ) : (
              <div className="space-y-2">
                {topKader.map((k, i) => (
                  <div key={k.uid} className={`flex items-center gap-3 p-3 rounded-xl ${i < 3 ? 'bg-amber-500/5' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-gray-300 text-gray-700' : i === 2 ? 'bg-amber-600 text-white' : 'bg-muted text-muted-foreground'
                    }`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-primary truncate">{k.displayName}</p>
                        <span className="text-[10px] text-muted-foreground">Lv.{k.level} {getLevelTitle(k.level)}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{k.districtName || 'Belum ditetapkan'}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-amber-500 flex items-center gap-1"><Zap className="w-3.5 h-3.5" />{(k.xp || 0).toLocaleString('id-ID')}</p>
                      <p className="text-[10px] text-muted-foreground">{k.memberCount} anggota</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ChartCard>
        </>
      ) : null}
    </div>
  );
}

function KpiCard({ icon, color, bg, value, label }: { icon: React.ReactNode; color: string; bg: string; value: string; label: string }) {
  return (
    <div className="card p-4">
      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-2 ${color}`}>{icon}</div>
      <p className="text-lg font-bold text-primary leading-tight">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function ChartCard({ title, children, extra, className = '' }: { title: string; children: React.ReactNode; extra?: React.ReactNode; className?: string }) {
  return (
    <div className={`card p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-primary">{title}</h3>
        {extra}
      </div>
      {children}
    </div>
  );
}

function MiniStatSkeleton() {
  return <div className="card p-4 space-y-2"><div className="skeleton h-9 w-9 rounded-xl" /><div className="skeleton h-5 w-20" /><div className="skeleton h-3 w-16" /></div>;
}