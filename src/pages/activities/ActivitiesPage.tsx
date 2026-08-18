import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getActivities, TARGET_TYPES, type ActivityFilters } from '@/services/activity/activityService';
import { getDistrictOptions } from '@/constants/regions';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ActivityLog } from '@/types';
import type { DocumentSnapshot } from 'firebase/firestore';
import { Activity, Clock, Filter, Loader2, User, Users, MapPin, FileText, BarChart3, UserCheck, X } from 'lucide-react';

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  member: Users,
  kader: UserCheck,
  kader_target: BarChart3,
  region: MapPin,
  quiz: FileText,
  export: BarChart3,
  user: User,
};

export default function ActivitiesPage() {
  const { user, hasMinRole } = useAuth();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filters, setFilters] = useState<ActivityFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const lastDocRef = useRef<DocumentSnapshot | null>(null);

  // Kader can only see their own activities, admins see all
  const isKader = !hasMinRole('admin_desa');

  const buildFilters = useCallback((): ActivityFilters => {
    const f: ActivityFilters = { ...filters };
    if (isKader && user) f.userId = user.uid;
    if (dateFrom) f.dateFrom = new Date(dateFrom).getTime();
    if (dateTo) f.dateTo = new Date(dateTo).setHours(23, 59, 59, 999);
    return f;
  }, [filters, dateFrom, dateTo, isKader, user]);

  const fetch = useCallback(async (reset = true) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);
    try {
      const r = await getActivities({
        filters: buildFilters(),
        pageSize: 30,
        startAfterDoc: reset ? null : lastDocRef.current,
      });
      if (reset) setActivities(r.data);
      else setActivities(p => [...p, ...r.data]);
      setHasMore(r.hasNextPage);
      lastDocRef.current = r.lastDoc;
    } catch { /* empty */ }
    finally { setLoading(false); setLoadingMore(false); }
  }, [buildFilters]);

  useEffect(() => { fetch(true); }, [fetch]);

  const handleFilterChange = (key: keyof ActivityFilters, value: string | undefined) => {
    setFilters(f => ({ ...f, [key]: value || undefined }));
    lastDocRef.current = null;
  };

  const clearFilters = () => {
    setFilters({});
    setDateFrom('');
    setDateTo('');
    lastDocRef.current = null;
  };

  const activeFilterCount = [filters.targetType, filters.districtId, dateFrom, dateTo].filter(Boolean).length;

  return (
    <div className="space-y-5 pb-20 lg:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-primary">Aktivitas</h2>
          <p className="text-sm text-muted-foreground">
            {loading ? 'Memuat...' : `${activities.length} aktivitas`}
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn-outline h-10 px-3 flex items-center gap-2 ${activeFilterCount > 0 ? 'border-accent text-accent' : ''}`}
        >
          <Filter className="w-4 h-4" /> Filter
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">{activeFilterCount}</span>
          )}
        </button>
      </div>

      {showFilters && (
        <div className="card p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-primary">Filter Aktivitas</h3>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="text-xs text-accent hover:underline">Reset semua</button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tipe</label>
              <select value={filters.targetType || ''} onChange={e => handleFilterChange('targetType', e.target.value || undefined)} className="input-field h-10 text-sm">
                <option value="">Semua</option>
                {TARGET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            {!isKader && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Kecamatan</label>
                <select value={filters.districtId || ''} onChange={e => handleFilterChange('districtId', e.target.value || undefined)} className="input-field h-10 text-sm">
                  <option value="">Semua</option>
                  {getDistrictOptions().map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Dari Tanggal</label>
              <div className="relative">
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-field h-10 text-sm pr-9" />
                {dateFrom && (
                  <button onClick={() => setDateFrom('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Sampai Tanggal</label>
              <div className="relative">
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-field h-10 text-sm pr-9" />
                {dateTo && (
                  <button onClick={() => setDateTo('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="card p-4 flex gap-3"><div className="skeleton w-9 h-9 rounded-full flex-shrink-0" /><div className="flex-1 space-y-2"><div className="skeleton h-4 w-48" /><div className="skeleton h-3 w-32" /></div></div>)}</div>
      ) : activities.length === 0 ? (
        <EmptyState icon={<Activity className="w-8 h-8 text-muted-foreground" />} title="Belum ada aktivitas" description="Aktivitas pengguna akan muncul di sini" />
      ) : (
        <div className="space-y-2">
          {activities.map(a => {
            const Icon = TYPE_ICON[a.targetType] || Activity;
            return (
              <div key={a.activityId} className="card p-4 flex gap-3 items-start">
                <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-primary"><span className="font-semibold">{a.userName}</span> {a.action}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {a.districtName && (
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {a.districtName}
                      </span>
                    )}
                    {a.targetType && (
                      <span className="text-[10px] font-medium bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{a.targetType}</span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1 flex-shrink-0">
                  <Clock className="w-3 h-3" /> {formatTimeAgo(a.timestamp)}
                </span>
              </div>
            );
          })}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <button onClick={() => fetch(false)} disabled={loadingMore} className="btn-outline text-sm flex items-center gap-2">
                {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                Muat Lebih Banyak
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Baru saja';
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} hari lalu`;
  return new Date(ts).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}
