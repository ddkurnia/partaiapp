import { useState, useEffect, useCallback, useRef } from 'react';
import { getActivities, TARGET_TYPES, type ActivityFilters } from '@/services/activity/activityService';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ActivityLog } from '@/types';
import { Activity, Clock, Filter, Loader2, User, Users, MapPin, FileText, BarChart3 } from 'lucide-react';

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  member: Users,
  region: MapPin,
  quiz: FileText,
  export: BarChart3,
  user: User,
};

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filters, setFilters] = useState<ActivityFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const lastDocRef = useRef<ReturnType<typeof Object> | null>(null);

  const fetch = useCallback(async (reset = true) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);
    try {
      const r = await getActivities({
        filters,
        pageSize: 30,
        startAfterDoc: reset ? null : (lastDocRef.current as any) || null,
      });
      if (reset) setActivities(r.data);
      else setActivities(p => [...p, ...r.data]);
      setHasMore(r.hasNextPage);
      lastDocRef.current = r.lastDoc;
    } catch { /* empty */ }
    finally { setLoading(false); setLoadingMore(false); }
  }, [filters]);

  useEffect(() => { fetch(true); }, [fetch]);

  return (
    <div className="space-y-5 pb-20 lg:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-primary">Aktivitas</h2>
          <p className="text-sm text-muted-foreground">Riwayat aktivitas pengguna</p>
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className="btn-outline h-10 px-3 flex items-center gap-2">
          <Filter className="w-4 h-4" /> Filter
        </button>
      </div>

      {showFilters && (
        <div className="card p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tipe Aktivitas</label>
              <select value={filters.targetType || ''} onChange={e => setFilters(f => ({ ...f, targetType: e.target.value || undefined }))} className="input-field h-10 text-sm">
                <option value="">Semua</option>
                {TARGET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="card p-4 flex gap-3"><div className="skeleton w-9 h-9 rounded-full flex-shrink-0" /><div className="flex-1 space-y-2"><div className="skeleton h-4 w-48" /><div className="skeleton h-3 w-32" /></div></div>)}</div>
      ) : activities.length === 0 ? (
        <EmptyState icon={<Activity className="w-8 h-8 text-muted-foreground" />} title="Belum ada aktivitas" />
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
                  {a.districtId && <p className="text-xs text-muted-foreground mt-0.5">Wilayah: {a.districtId}</p>}
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
  if (m < 60) return `${m} mnt`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam`;
  return `${Math.floor(h / 24)} hari`;
}