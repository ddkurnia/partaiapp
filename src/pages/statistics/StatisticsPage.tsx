import { useState, useEffect } from 'react';
import {
  collection, getDocs, query, where, orderBy, limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getDistrictOptions, getVillageOptions, getDistrictName } from '@/constants/regions';
import { Skeleton, ChartSkeleton } from '@/components/ui/Skeleton';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { BarChart3, TrendingUp, Users, ShieldCheck, UserCheck, Filter, Download } from 'lucide-react';
import toast from 'react-hot-toast';

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

interface StatData {
  totalMembers: number;
  verified: number;
  pending: number;
  active: number;
  genderData: { name: string; value: number }[];
  districtData: { name: string; total: number; verified: number }[];
  monthlyData: { month: string; total: number; verified: number }[];
}

export default function StatisticsPage() {
  const [data, setData] = useState<StatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [districtFilter, setDistrictFilter] = useState('');
  const [villageFilter, setVillageFilter] = useState('');

  useEffect(() => {
    loadStats();
  }, [districtFilter, villageFilter]);

  async function loadStats() {
    setLoading(true);
    try {
      const constraints: any[] = [];
      if (districtFilter) constraints.push(where('districtId', '==', districtFilter));
      if (villageFilter) constraints.push(where('villageId', '==', villageFilter));
      constraints.push(orderBy('createdAt', 'desc'), limit(5000));
      const snap = await getDocs(query(collection(db, 'members'), ...constraints));

      let verified = 0, pending = 0, active = 0;
      const genderMap: Record<string, number> = {};
      const districtMap: Record<string, { total: number; verified: number }> = {};
      const monthlyMap: Record<string, { total: number; verified: number }> = {};

      snap.docs.forEach(d => {
        const m = d.data();
        if (m.verificationStatus === 'verified') verified++;
        if (m.verificationStatus === 'pending') pending++;
        if (m.status === 'active') active++;
        genderMap[m.gender === 'L' ? 'Laki-laki' : 'Perempuan'] = (genderMap[m.gender === 'L' ? 'Laki-laki' : 'Perempuan'] || 0) + 1;
        const dk = m.districtId || 'unknown';
        if (!districtMap[dk]) districtMap[dk] = { total: 0, verified: 0 };
        districtMap[dk].total++;
        if (m.verificationStatus === 'verified') districtMap[dk].verified++;
        // Monthly
        if (m.createdAt) {
          const dt = new Date(m.createdAt);
          const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
          if (!monthlyMap[key]) monthlyMap[key] = { total: 0, verified: 0 };
          monthlyMap[key].total++;
          if (m.verificationStatus === 'verified') monthlyMap[key].verified++;
        }
      });

      const genderData = Object.entries(genderMap).map(([name, value]) => ({ name, value }));
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

      setData({ totalMembers: snap.size, verified, pending, active, genderData, districtData, monthlyData });
    } catch {
      toast.error('Gagal memuat statistik');
    }
    setLoading(false);
  }

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
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-primary">Filter</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select value={districtFilter} onChange={e => { setDistrictFilter(e.target.value); setVillageFilter(''); }} className="input-field h-10 text-sm">
            <option value="">Semua Kecamatan</option>
            {getDistrictOptions().map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
          <select value={villageFilter} onChange={e => setVillageFilter(e.target.value)} className="input-field h-10 text-sm" disabled={!districtFilter}>
            <option value="">Semua Desa</option>
            {getVillageOptions(districtFilter).map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}</div>
          <ChartSkeleton /><ChartSkeleton />
        </div>
      ) : data ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard icon={<Users className="w-4 h-4" />} color="text-accent" bg="bg-accent/10" value={data.totalMembers.toLocaleString('id-ID')} label="Total Anggota" />
            <KpiCard icon={<ShieldCheck className="w-4 h-4" />} color="text-emerald-500" bg="bg-emerald-500/10" value={`${data.verified.toLocaleString('id-ID')} (${data.totalMembers ? Math.round(data.verified / data.totalMembers * 100) : 0}%)`} label="Data Valid" />
            <KpiCard icon={<TrendingUp className="w-4 h-4" />} color="text-amber-500" bg="bg-amber-500/10" value={data.pending.toLocaleString('id-ID')} label="Perlu Verifikasi" />
            <KpiCard icon={<UserCheck className="w-4 h-4" />} color="text-blue-500" bg="bg-blue-500/10" value={data.active.toLocaleString('id-ID')} label="Anggota Aktif" />
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Pertumbuhan Anggota">
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
          </div>

          {/* District Chart */}
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
        </>
      ) : null}
    </div>
  );
}

function KpiCard({ icon, color, bg, value, label }: { icon: React.ReactNode; color: string; bg: string; value: string; label: string }) {
  return (
    <div className="card p-4">
      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-2 ${color}`}>{icon}</div>
      <p className="text-xl font-bold text-primary leading-tight">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-primary mb-4">{title}</h3>
      {children}
    </div>
  );
}

function CardSkeleton() {
  return <div className="card p-4 space-y-2"><div className="skeleton h-9 w-9 rounded-xl" /><div className="skeleton h-6 w-20" /><div className="skeleton h-3 w-16" /></div>;
}