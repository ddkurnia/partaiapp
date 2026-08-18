import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, orderBy, limit, startAfter, getDocs, where, type DocumentSnapshot, type QueryConstraint } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Shield, Clock, Filter, Loader2, Plus, Pencil, Trash2, Eye, Download, LogIn, LogOut, ShieldCheck } from 'lucide-react';

interface AuditEntry {
  auditId: string;
  userId: string;
  action: string;
  targetType: string;
  targetId?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

const ACTION_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  create: { label: 'Buat', color: 'text-emerald-500 bg-emerald-500/10', icon: Plus },
  update: { label: 'Ubah', color: 'text-blue-500 bg-blue-500/10', icon: Pencil },
  delete: { label: 'Hapus', color: 'text-red-500 bg-red-500/10', icon: Trash2 },
  login: { label: 'Login', color: 'text-purple-500 bg-purple-500/10', icon: LogIn },
  logout: { label: 'Logout', color: 'text-gray-500 bg-gray-500/10', icon: LogOut },
  verify: { label: 'Verifikasi', color: 'text-amber-500 bg-amber-500/10', icon: ShieldCheck },
  export: { label: 'Ekspor', color: 'text-cyan-500 bg-cyan-500/10', icon: Download },
  view: { label: 'Lihat', color: 'text-gray-500 bg-gray-500/10', icon: Eye },
};

const ACTION_OPTIONS = [
  { value: 'create', label: 'Buat' },
  { value: 'update', label: 'Ubah' },
  { value: 'delete', label: 'Hapus' },
  { value: 'verify', label: 'Verifikasi' },
  { value: 'export', label: 'Ekspor' },
  { value: 'login', label: 'Login' },
];

export default function AuditPage() {
  const { hasMinRole } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [actionFilter, setActionFilter] = useState('');
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

  const fetch = useCallback(async (reset = true) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);
    try {
      const c: QueryConstraint[] = [orderBy('timestamp', 'desc'), limit(50)];
      if (actionFilter) c.splice(0, 0, where('action', '==', actionFilter));
      if (lastDocRef.current && !reset) c.push(startAfter(lastDocRef.current));
      const snap = await getDocs(query(collection(db, 'audit_logs'), ...c));
      const docs = snap.docs;
      const more = docs.length > 49;
      const data = docs.slice(0, 49).map(d => ({ auditId: d.id, ...d.data() } as AuditEntry));
      if (reset) setEntries(data); else setEntries(p => [...p, ...data]);
      setHasMore(more);
      lastDocRef.current = more ? docs[48] : (docs.length > 0 ? docs[docs.length - 1] : null);
    } catch { /* */ }
    finally { setLoading(false); setLoadingMore(false); }
  }, [actionFilter]);

  useEffect(() => { fetch(true); }, [fetch]);

  return (
    <div className="space-y-5 pb-20 lg:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-primary">Audit Log</h2>
          <p className="text-sm text-muted-foreground">Riwayat aksi penting dalam sistem</p>
        </div>
      </div>

      <div className="flex gap-2">
        <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); lastDocRef.current = null; }} className="input-field h-10 text-sm max-w-[200px]">
          <option value="">Semua Aksi</option>
          {ACTION_OPTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="card p-4 flex gap-3"><div className="skeleton w-9 h-9 rounded-lg flex-shrink-0" /><div className="flex-1 space-y-2"><div className="skeleton h-4 w-48" /><div className="skeleton h-3 w-32" /></div></div>)}</div>
      ) : entries.length === 0 ? (
        <EmptyState icon={<Shield className="w-8 h-8 text-muted-foreground" />} title="Belum ada audit log" />
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
                  {e.metadata && Object.keys(e.metadata).length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">{JSON.stringify(e.metadata)}</p>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1 flex-shrink-0">
                  <Clock className="w-3 h-3" /> {new Date(e.timestamp).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
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
