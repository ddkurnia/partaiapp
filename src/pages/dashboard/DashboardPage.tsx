import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { CardSkeleton, ChartSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Users,
  UserCheck,
  UserPlus,
  ShieldCheck,
  AlertCircle,
  Activity,
  TrendingUp,
  Clock,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { ActivityLog, DashboardStats } from '@/types';

const GENDER_DATA = [
  { name: 'Laki-laki', value: 12450, color: '#10b981' },
  { name: 'Perempuan', value: 11320, color: '#f59e0b' },
];

const MONTHLY_DATA = [
  { month: 'Jan', anggota: 320 },
  { month: 'Feb', anggota: 280 },
  { month: 'Mar', anggota: 450 },
  { month: 'Apr', anggota: 390 },
  { month: 'Mei', anggota: 520 },
  { month: 'Jun', anggota: 480 },
  { month: 'Jul', anggota: 610 },
];

const DISTRICT_DATA = [
  { name: 'Merbau', anggota: 2431 },
  { name: 'Tebing Tinggi', anggota: 1876 },
  { name: 'Rangsang', anggota: 1543 },
  { name: 'Rangsang Barat', anggota: 1298 },
  { name: 'Teheran', anggota: 987 },
  { name: 'Pulau Kijang', anggota: 865 },
  { name: 'Katan', anggota: 732 },
  { name: 'Sungai Tohor', anggota: 654 },
];

const statCards = [
  { key: 'totalMembers', label: 'Total Anggota', icon: Users, color: 'bg-accent/10 text-accent', format: (v: number) => v.toLocaleString('id-ID') },
  { key: 'activeCadres', label: 'Kader Aktif', icon: UserCheck, color: 'bg-blue-500/10 text-blue-500', format: (v: number) => v.toLocaleString('id-ID') },
  { key: 'newMembersThisMonth', label: 'Anggota Baru', icon: UserPlus, color: 'bg-amber-500/10 text-amber-500', format: (v: number) => `+${v.toLocaleString('id-ID')}` },
  { key: 'verifiedData', label: 'Data Valid', icon: ShieldCheck, color: 'bg-emerald-500/10 text-emerald-500', format: (v: number) => `${v}%` },
  { key: 'pendingVerification', label: 'Perlu Verifikasi', icon: AlertCircle, color: 'bg-red-500/10 text-red-500', format: (v: number) => v.toLocaleString('id-ID') },
  { key: 'todayActivities', label: 'Aktivitas Hari Ini', icon: Activity, color: 'bg-purple-500/10 text-purple-500', format: (v: number) => v.toLocaleString('id-ID') },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load demo stats (will be replaced with real Firestore queries)
    const timer = setTimeout(() => {
      setStats({
        totalMembers: 23770,
        activeCadres: 1834,
        newMembersThisMonth: 610,
        verifiedData: 96,
        pendingVerification: 847,
        todayActivities: 47,
      });
      setLoading(false);
    }, 800);

    // Real-time activity listener
    let unsubscribe: (() => void) | undefined;
    try {
      const q = query(
        collection(db, 'activity_logs'),
        orderBy('timestamp', 'desc'),
        limit(10),
      );
      unsubscribe = onSnapshot(q, (snap) => {
        const items = snap.docs.map(d => ({
          activityId: d.id,
          ...d.data(),
        })) as ActivityLog[];
        setActivities(items.length > 0 ? items : DEMO_ACTIVITIES);
      }, () => {
        setActivities(DEMO_ACTIVITIES);
      });
    } catch {
      setActivities(DEMO_ACTIVITIES);
    }

    return () => {
      clearTimeout(timer);
      unsubscribe?.();
    };
  }, []);

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Welcome */}
      <div>
        <h2 className="text-xl font-bold text-primary">
          Halo, {user?.displayName || 'User'}
        </h2>
        <p className="text-sm text-muted-foreground">
          Berikut ringkasan data organisasi hari ini.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 lg:gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
          : stats && statCards.map((card) => {
              const Icon = card.icon;
              const value = stats[card.key as keyof DashboardStats] as number;
              return (
                <div key={card.key} className="card p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <TrendingUp className="w-3.5 h-3.5 text-accent" />
                  </div>
                  <p className="text-2xl font-bold text-primary">
                    {card.format(value)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
                </div>
              );
            })
        }
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Monthly Growth */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-primary mb-4">Pertumbuhan Anggota</h3>
          {loading ? (
            <ChartSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={MONTHLY_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" />
                <YAxis tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="anggota" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Gender Distribution */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-primary mb-4">Distribusi Gender</h3>
          {loading ? (
            <ChartSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={GENDER_DATA}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {GENDER_DATA.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => Number(value).toLocaleString('id-ID')}
                  contentStyle={{
                    backgroundColor: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="flex justify-center gap-4 mt-2">
            {GENDER_DATA.map((item) => (
              <div key={item.name} className="flex items-center gap-2 text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-muted-foreground">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* District Chart */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-primary mb-4">Anggota per Kecamatan</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={DISTRICT_DATA} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" width={100} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '12px',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="anggota" fill="#0f172a" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Activity */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-primary mb-4">Aktivitas Terbaru</h3>
          <div className="space-y-3 max-h-[260px] overflow-y-auto scrollbar-thin">
            {activities.length === 0 ? (
              <EmptyState
                title="Belum ada aktivitas"
                description="Aktivitas terbaru akan muncul di sini"
              />
            ) : (
              activities.map((act) => (
                <div key={act.activityId} className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Activity className="w-3.5 h-3.5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-primary">{act.userName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {act.action}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTimeAgo(act.timestamp)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const DEMO_ACTIVITIES: ActivityLog[] = [
  { activityId: '1', userId: 'u1', userName: 'Andi', action: 'menambahkan anggota baru', targetType: 'member', timestamp: Date.now() - 120000 },
  { activityId: '2', userId: 'u2', userName: 'Budi', action: 'memverifikasi 4 data anggota', targetType: 'member', timestamp: Date.now() - 300000 },
  { activityId: '3', userId: 'u3', userName: 'Admin Merbau', action: 'memperbarui data wilayah', targetType: 'region', timestamp: Date.now() - 480000 },
  { activityId: '4', userId: 'u4', userName: 'Siti', action: 'menyelesaikan pelatihan digital', targetType: 'quiz', timestamp: Date.now() - 720000 },
  { activityId: '5', userId: 'u5', userName: 'Rizal', action: 'menambahkan 3 anggota baru', targetType: 'member', timestamp: Date.now() - 900000 },
  { activityId: '6', userId: 'u6', userName: 'Dewi', action: 'mengekspor laporan kecamatan', targetType: 'export', timestamp: Date.now() - 1200000 },
];

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Baru saja';
  if (minutes < 60) return `${minutes} mnt lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.floor(hours / 24)} hari lalu`;
}