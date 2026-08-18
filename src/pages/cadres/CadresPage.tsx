import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';
import { getCadresPaginated, getCadreStats, type CadreFilters, getLevelTitle } from '@/services/cadres/cadreService';
import { getDistrictOptions, getVillageOptions } from '@/constants/regions';
import { ROLES, LEVEL_THRESHOLDS } from '@/constants/roles';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardSkeleton } from '@/components/ui/Skeleton';
import type { DocumentSnapshot } from 'firebase/firestore';
import type { KaderProfile } from '@/types';
import {
  UserCheck, Trophy, Users, ShieldCheck, Star, Loader2,
  SlidersHorizontal, MapPin, Search, X, ChevronDown, BarChart3, Target, Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function CadresPage() {
  const { hasMinRole } = useAuth();
  const navigate = useNavigate();
  const [cadres, setCadres] = useState<KaderProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<CadreFilters>({});
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput);
  const [stats, setStats] = useState<{ totalCadres: number; totalXP: number; avgLevel: number; levelDistribution: { level: number; count: number; label: string }[] } | null>(null);
  const lastDocRef = useRef<DocumentSnapshot | null>(null);

  const fetchData = useCallback(async (reset = true) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);
    try {
      // If searching, fetch all and filter client-side (Firestore doesn't support full-text search)
      if (debouncedSearch.length >= 2) {
        const result = await getCadresPaginated({ filters, pageSize: 100, startAfterDoc: null });
        const filtered = result.data.filter(c =>
          c.displayName?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          c.email?.toLowerCase().includes(debouncedSearch.toLowerCase())
        );
        setCadres(filtered);
        setHasMore(false);
      } else {
        const result = await getCadresPaginated({
          filters,
          pageSize: 20,
          startAfterDoc: reset ? null : lastDocRef.current,
        });
        if (reset) setCadres(result.data);
        else setCadres(prev => [...prev, ...result.data]);
        setHasMore(result.hasNextPage);
        lastDocRef.current = result.lastDoc;
      }
    } catch {
      toast.error('Gagal memuat data kader');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters, debouncedSearch]);

  useEffect(() => { fetchData(true); }, [fetchData]);

  useEffect(() => {
    if (hasMinRole('admin_kabupaten')) {
      getCadreStats().then(setStats).catch(() => {});
    }
  }, [hasMinRole]);

  const handleFilterChange = (key: keyof CadreFilters, value: string | undefined) => {
    const newFilters = { ...filters, [key]: value || undefined };
    setFilters(newFilters);
    lastDocRef.current = null;
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="space-y-5 pb-20 lg:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-primary">Kader</h2>
          <p className="text-sm text-muted-foreground">
            {loading ? 'Memuat...' : `${cadres.length} kader terdaftar`}
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn-outline h-10 px-3 flex items-center gap-2 ${activeFilterCount > 0 ? 'border-accent text-accent' : ''}`}
        >
          <SlidersHorizontal className="w-4 h-4" /> Filter
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={<UserCheck className="w-4 h-4" />} bg="bg-accent/10" color="text-accent" value={stats.totalCadres.toLocaleString('id-ID')} label="Total Kader" />
          <StatCard icon={<Trophy className="w-4 h-4" />} bg="bg-amber-500/10" color="text-amber-500" value={stats.totalXP.toLocaleString('id-ID')} label="Total XP" />
          <StatCard icon={<Star className="w-4 h-4" />} bg="bg-purple-500/10" color="text-purple-500" value={stats.avgLevel.toString()} label="Rata-rata Level" />
          <StatCard icon={<Target className="w-4 h-4" />} bg="bg-blue-500/10" color="text-blue-500" value={stats.levelDistribution.filter(l => l.level >= 5).reduce((s, l) => s + l.count, 0).toString()} label="Level 5+" />
        </div>
      )}

      {/* Search + Filter Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari nama atau email kader..."
            className="input-field pl-10 h-11"
          />
          {searchInput && (
            <button onClick={() => setSearchInput('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-muted-foreground hover:text-primary" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="card p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-primary">Filter Kader</h3>
            {activeFilterCount > 0 && (
              <button onClick={() => { setFilters({}); lastDocRef.current = null; }} className="text-xs text-accent hover:underline">Reset semua</button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Kecamatan</label>
              <select
                value={filters.districtId || ''}
                onChange={(e) => handleFilterChange('districtId', e.target.value)}
                className="input-field h-10 text-sm"
              >
                <option value="">Semua Kecamatan</option>
                {getDistrictOptions().map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Level Minimum</label>
              <select
                value={filters.levelMin ?? ''}
                onChange={(e) => handleFilterChange('levelMin', e.target.value || undefined)}
                className="input-field h-10 text-sm"
              >
                <option value="">Semua Level</option>
                {LEVEL_THRESHOLDS.map(t => (
                  <option key={t.level} value={t.level}>Level {t.level} ({t.xpRequired} XP)</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card p-4 flex items-center gap-4">
              <div className="skeleton w-12 h-12 rounded-full" />
              <div className="flex-1 space-y-2"><div className="skeleton h-4 w-40" /><div className="skeleton h-3 w-24" /></div>
            </div>
          ))}
        </div>
      ) : cadres.length === 0 ? (
        <EmptyState
          icon={<UserCheck className="w-8 h-8 text-muted-foreground" />}
          title="Belum ada kader"
          description={searchInput ? `Tidak ditemukan kader untuk "${searchInput}"` : 'Kader akan muncul setelah mendaftar'}
        />
      ) : (
        <div className="space-y-3">
          {cadres.map(c => (
            <CadreCard key={c.uid} cadre={c} onClick={() => navigate(`/cadres/${c.uid}`)} />
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

function StatCard({ icon, bg, color, value, label }: { icon: React.ReactNode; bg: string; color: string; value: string; label: string }) {
  return (
    <div className="card p-4">
      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-2 ${color}`}>{icon}</div>
      <p className="text-xl font-bold text-primary leading-tight">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function CadreCard({ cadre, onClick }: { cadre: KaderProfile; onClick: () => void }) {
  const roleInfo = ROLES[cadre.role];
  const levelTitle = getLevelTitle(cadre.level);
  const xp = cadre.xp || 0;
  const nextThreshold = LEVEL_THRESHOLDS.find(t => t.level === cadre.level + 1);
  const currentThreshold = LEVEL_THRESHOLDS.find(t => t.level === cadre.level);
  const xpInLevel = nextThreshold ? xp - (currentThreshold?.xpRequired || 0) : 0;
  const xpNeeded = nextThreshold ? nextThreshold.xpRequired - (currentThreshold?.xpRequired || 0) : 1;
  const progress = nextThreshold ? Math.min(100, (xpInLevel / xpNeeded) * 100) : 100;

  return (
    <button
      onClick={onClick}
      className="card p-4 w-full text-left hover:shadow-md transition-all hover:border-accent/30"
    >
      <div className="flex items-start gap-4">
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

          {/* XP Progress Bar */}
          <div className="mt-2.5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-amber-500" />
                <span className="text-[11px] font-medium text-primary">Lv.{cadre.level} — {levelTitle}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">{xp.toLocaleString('id-ID')} XP</span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent to-emerald-400 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 mt-2.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
              <span className="font-semibold text-primary">{cadre.memberCount}</span> anggota
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span className="font-semibold text-primary">{cadre.verifiedCount}</span> valid
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
