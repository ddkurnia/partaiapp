import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getCadresPaginated, getCadreStats, type CadreProfile, type CadreFilters } from '@/services/cadres/cadreService';
import { getDistrictOptions } from '@/constants/regions';
import { ROLES } from '@/constants/roles';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  UserCheck, Trophy, Users, ShieldCheck, Star, Loader2,
  SlidersHorizontal, MapPin,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function CadresPage() {
  const { hasMinRole } = useAuth();
  const [cadres, setCadres] = useState<CadreProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<CadreFilters>({});
  const [stats, setStats] = useState<{ totalCadres: number; totalXP: number; avgLevel: number } | null>(null);

  const canManage = hasMinRole('admin_kabupaten');

  const fetchData = useCallback(async (reset = true) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);
    try {
      const result = await getCadresPaginated({
        filters,
        pageSize: 20,
        startAfterDoc: reset ? null : undefined,
      });
      if (reset) setCadres(result.data);
      else setCadres(prev => [...prev, ...result.data]);
      setHasMore(result.hasNextPage);
    } catch {
      toast.error('Gagal memuat data kader');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters]);

  useEffect(() => { fetchData(true); }, [fetchData]);

  useEffect(() => {
    if (hasMinRole('admin_kabupaten')) {
      getCadreStats().then(setStats).catch(() => {});
    }
  }, [hasMinRole]);

  return (
    <div className="space-y-5 pb-20 lg:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-primary">Kader</h2>
          <p className="text-sm text-muted-foreground">
            {loading ? 'Memuat...' : `${cadres.length} kader terdaftar`}
          </p>
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className="btn-outline h-10 px-3 flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4" /> Filter
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-4">
            <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center mb-2">
              <UserCheck className="w-4 h-4 text-accent" />
            </div>
            <p className="text-xl font-bold text-primary">{stats.totalCadres}</p>
            <p className="text-[11px] text-muted-foreground">Total Kader</p>
          </div>
          <div className="card p-4">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center mb-2">
              <Trophy className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-xl font-bold text-primary">{stats.totalXP.toLocaleString('id-ID')}</p>
            <p className="text-[11px] text-muted-foreground">Total XP</p>
          </div>
          <div className="card p-4">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center mb-2">
              <Star className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-xl font-bold text-primary">{stats.avgLevel}</p>
            <p className="text-[11px] text-muted-foreground">Rata-rata Level</p>
          </div>
        </div>
      )}

      {/* Filter */}
      {showFilters && (
        <div className="card p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Kecamatan</label>
              <select
                value={filters.districtId || ''}
                onChange={(e) => setFilters({ ...filters, districtId: e.target.value || undefined })}
                className="input-field h-10 text-sm"
              >
                <option value="">Semua</option>
                {getDistrictOptions().map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3"> {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card p-4 flex items-center gap-4">
            <div className="skeleton w-12 h-12 rounded-full" />
            <div className="flex-1 space-y-2"><div className="skeleton h-4 w-40" /><div className="skeleton h-3 w-24" /></div>
          </div>
        ))}</div>
      ) : cadres.length === 0 ? (
        <EmptyState icon={<UserCheck className="w-8 h-8 text-muted-foreground" />} title="Belum ada kader" />
      ) : (
        <div className="space-y-3">
          {cadres.map(c => (
            <CadreCard key={c.uid} cadre={c} />
          ))}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <button onClick={() => fetchData(false)} disabled={loadingMore} className="btn-outline text-sm flex items-center gap-2">
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

function CadreCard({ cadre }: { cadre: CadreProfile }) {
  const roleInfo = ROLES[cadre.role];
  return (
    <div className="card p-4 flex items-start gap-4 hover:shadow-md transition-shadow">
      <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center flex-shrink-0">
        <span className="text-accent font-bold text-lg">{cadre.displayName?.charAt(0).toUpperCase()}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-primary text-sm">{cadre.displayName}</p>
          <span className="text-[10px] font-medium bg-accent/10 text-accent px-2 py-0.5 rounded-full">{roleInfo.label}</span>
        </div>
        {cadre.districtName && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3" /> {cadre.districtName}{cadre.villageName ? `, ${cadre.villageName}` : ''}
          </p>
        )}
        <div className="flex items-center gap-4 mt-2.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            <span className="font-semibold text-primary">{cadre.memberCount}</span> anggota
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span className="font-semibold text-primary">{cadre.verifiedCount}</span> valid
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Star className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-semibold text-primary">Lv.{cadre.level}</span>
            <span className="text-[10px] text-muted-foreground">({(cadre.xp || 0).toLocaleString('id-ID')} XP)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
