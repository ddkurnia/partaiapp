import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAuditLogs, AUDIT_ACTIONS, type AuditFilters } from '@/services/activity/activityService';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import type { AuditLog } from '@/types';
import type { DocumentSnapshot } from 'firebase/firestore';
import { Shield, Clock, Loader2, Plus, Pencil, Trash2, Eye, Download, LogIn, Zap, X, Filter, User } from 'lucide-react';

const ACTION_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  create: { label: 'Buat', color: 'text-emerald-500 bg-emerald-500/10', icon: Plus },
  update: { label: 'Ubah', color: 'text-blue-500 bg-blue-500/10', icon: Pencil },
  delete: { label: 'Hapus', color: 'text-red-500 bg-red-500/10', icon: Trash2 },
  login: { label: 'Login', color: 'text-purple-500 bg-purple-500/10', icon: LogIn },
  update_xp: { label: 'Tambah XP', color: 'text-amber-500 bg-amber-500/10', icon: Zap },
  verify: { label: 'Verifikasi', color: 'text-cyan-500 bg-cyan-500/10', icon: Eye },
  export: { label: 'Ekspor', color: 'text-cyan-500 bg-cyan-500/10', icon: Download },
};

export default function AuditPage() {
  const { hasMinRole } = useAuth();
  const [entries, setEntries] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filters, setFilters] = useState<AuditFilters>({});
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const lastDocRef = useRef<DocumentSnapshot | null>(null);

  if (!hasMinRole('admin_kabupaten')) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Akses terbatas</p>
        </div>
      </div>
    );
  }

  const buildFilters = useCallback((): AuditFilters => {
    const f: AuditFilters = { ...filters };
    if (dateFrom) f.dateFrom = new Date(dateFrom).getTime();
    if (dateTo) f.dateTo = new Date(dateTo).setHours(23, 59, 59, 999);
    return f;
  }, [filters, dateFrom, dateTo]);

  const fetch = useCallback(async (reset = true) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);
    try {
      const r = await getAuditLogs({
        filters: buildFilters(),
        pageSize: 50,
        startAfterDoc: reset ? null : lastDocRef.current,
      });
      if (reset) setEntries(r.data);
      else setEntries(p => [...p, ...r.data]);
      setHasMore(r.hasNextPage);
      lastDocRef.current = r.lastDoc;
    } catch { /* */ }
    finally { setLoading(false); setLoadingMore(false); }
  }, [buildFilters]);

  useEffect(() => { fetch(true); }, [fetch]);

  const handleFilterChange = (key: keyof AuditFilters, value: string | undefined) => {
    setFilters(f => ({ ...f, [key]: value || undefined }));
    lastDocRef.current = null;
  };

  const clearFilters = () => {
    setFilters({});
    setDateFrom('');
    setDateTo('');
    lastDocRef.current = null;
  };

  const activeFilterCount = [filters.action, filters.targetType, dateFrom, dateTo].filter(Boolean).length;

  return (
    <div className="space-y-5 pb-20 lg:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-primary">Audit Log</h2>
          <p className="text-sm text-muted-foreground">
            {loading ? 'Memuat...' : `${entries.length} entri`}
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
            <h3 className="text-sm font-semibold text-primary">Filter Audit</h3>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="text-xs text-accent hover:underline">Reset semua</button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Aksi</label>
              <select value={filters.action || ''} onChange={e => handleFilterChange('action', e.target.value || undefined)} className="input-field h-10 text-sm">
                <option value="">Semua Aksi</option>
                {AUDIT_ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tipe Target</label>
              <select value={filters.targetType || ''} onChange={e => handleFilterChange('targetType', e.target.value || undefined)} className="input-field h-10 text-sm">
                <option value="">Semua</option>
                <option value="member">Anggota</option>
                <option value="kader">Kader</option>
                <option value="kader_target">Target Kader</option>
                <option value="user">Pengguna</option>
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
      )}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="card p-4 flex gap-3"><div className="skeleton w-9 h-9 rounded-lg flex-shrink-0" /><div className="flex-1 space-y-2"><div className="skeleton h-4 w-48" /><div className="skeleton h-3 w-32" /></div></div>)}</div>
      ) : entries.length === 0 ? (
        <EmptyState icon={<Shield className="w-8 h-8 text-muted-foreground" />} title="Belum ada audit log" description="Audit log akan tercatat saat ada aksi penting dalam sistem" />
      ) : (
        <div className="space-y-2">
          {entries.map(e => {
            const cfg = ACTION_CONFIG[e.action] || { label: e.action, color: 'text-gray-500 bg-gray-500/10', icon: Eye };
            const Icon = cfg.icon;
            return (
              <div key={e.auditId} className="card p-4 flex gap-3 items-start">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${cfg.color}`}>{cfg.label}</span>
                    <span className="text-xs text-muted-foreground">{e.targetType}{e.targetId ? ` #${e.targetId.slice(0, 8)}` : ''}</span>
                  </div>
                  {e.userName && (
                    <p className="text-xs text-primary mt-1 flex items-center gap-1">
                      <User className="w-3 h-3" /> {e.userName}
                    </p>
                  )}
                  {e.metadata && Object.keys(e.metadata).length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {formatMetadata(e.metadata).map((m, i) => (
                        <span key={i} className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground">{m.key}: {m.value}</span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1 flex-shrink-0 whitespace-nowrap">
                  <Clock className="w-3 h-3" /> {formatDate(e.timestamp)}
                </span>
              </div>
            );
          })}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <button onClick={() => fetch(false)} disabled={loadingMore} className="btn-outline text-sm flex items-center gap-2">
                {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />} Muat Lebih Banyak
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatMetadata(meta: Record<string, unknown>): { key: string; value: string }[] {
  return Object.entries(meta)
    .filter(([k]) => !['password', 'secret', 'token'].some(banned => k.toLowerCase().includes(banned)))
    .slice(0, 4)
    .map(([k, v]) => ({
      key: k,
      value: typeof v === 'string' ? v : typeof v === 'number' ? v.toLocaleString('id-ID') : String(v),
    }));
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}