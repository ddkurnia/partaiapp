import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMembers } from '@/hooks/useMembers';
import { useDebounce } from '@/hooks/useDebounce';
import { getDistrictOptions, getVillageOptions, getDistrictName, getVillageName } from '@/constants/regions';
import type { Member } from '@/types';
import type { MemberFilters } from '@/services/members/memberService';
import { canViewNIK } from '@/utils/permissions';
import { CardSkeleton, TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  Search, Filter, Plus, ChevronLeft, ChevronRight, MoreVertical,
  Eye, Pencil, Trash2, User, Shield, ShieldAlert, BadgeCheck,
  MapPin, Phone, X, Loader2, SlidersHorizontal, ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';

type StatusKey = Member['status'];
type VerifKey = Member['verificationStatus'];

const STATUS_CONFIG: Record<StatusKey, { label: string; class: string }> = {
  active: { label: 'Aktif', class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  inactive: { label: 'Tidak Aktif', class: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  suspended: { label: 'Ditangguhkan', class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const VERIF_CONFIG: Record<VerifKey, { label: string; icon: React.ComponentType<{ className?: string }>; class: string }> = {
  verified: { label: 'Terverifikasi', icon: BadgeCheck, class: 'text-emerald-500' },
  pending: { label: 'Pending', icon: Shield, class: 'text-amber-500' },
  rejected: { label: 'Ditolak', icon: ShieldAlert, class: 'text-red-500' },
};

export default function MemberListPage() {
  const { user, hasMinRole } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialDistrict = searchParams.get('district') || '';
  const initialVillage = searchParams.get('village') || '';
  const initialStatus = searchParams.get('status') as Member['status'] | null;
  const initialVerif = searchParams.get('verif') as Member['verificationStatus'] | null;

  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setLocalFilters] = useState<MemberFilters>({
    districtId: initialDistrict || undefined,
    villageId: initialVillage || undefined,
    status: initialStatus || undefined,
    verificationStatus: initialVerif || undefined,
  });
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const canAdd = hasMinRole('kader');
  const canEdit = hasMinRole('admin_desa');
  const canDelete = hasMinRole('admin_kabupaten');
  const showNIK = canViewNIK(user?.role || 'viewer');

  const {
    members, status, error, hasNextPage, refresh, loadMore, setFilters, search,
  } = useMembers({
    initialPageSize: 20,
    filters,
  });

  // Sync search
  useEffect(() => {
    search(debouncedSearch);
  }, [debouncedSearch, search]);

  const handleFilterChange = useCallback((key: keyof MemberFilters, value: string | undefined) => {
    const newFilters = { ...filters, [key]: value || undefined };
    if (key === 'districtId') {
      newFilters.villageId = undefined;
    }
    setLocalFilters(newFilters);
    setFilters(newFilters);
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key === 'districtId' ? 'district' : key === 'villageId' ? 'village' : key === 'status' ? 'status' : 'verif', value);
    else params.delete(key === 'districtId' ? 'district' : key === 'villageId' ? 'village' : key === 'status' ? 'status' : 'verif');
    setSearchParams(params);
  }, [filters, searchParams, setFilters, setSearchParams]);

  const handleDelete = async () => {
    if (!deleteTarget || !user) return;
    try {
      const { deleteMember } = await import('@/services/members/memberService');
      await deleteMember(deleteTarget.memberId, user.uid);
      toast.success('Anggota berhasil dihapus');
      refresh();
    } catch {
      toast.error('Gagal menghapus anggota');
    } finally {
      setDeleteTarget(null);
    }
  };

  const clearFilters = () => {
    const empty = {};
    setLocalFilters(empty);
    setFilters(empty);
    setSearchParams({});
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="space-y-4 pb-20 lg:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-primary">Anggota</h2>
          <p className="text-sm text-muted-foreground">
            {status === 'success' ? `${members.length} data` : 'Memuat data...'}
          </p>
        </div>
        {canAdd && (
          <button
            onClick={() => navigate('/members/new')}
            className="btn-primary flex items-center justify-center gap-2 h-11 text-sm"
          >
            <Plus className="w-4 h-4" />
            Tambah Anggota
          </button>
        )}
      </div>

      {/* Search + Filter Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari nama, NIK, atau telepon..."
            className="input-field pl-10 h-11"
          />
          {searchInput && (
            <button onClick={() => setSearchInput('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-muted-foreground hover:text-primary" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn-outline h-11 px-3 relative ${activeFilterCount > 0 ? 'border-accent text-accent' : ''}`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="card p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-primary">Filter</h3>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="text-xs text-accent hover:underline">Reset semua</button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <FilterSelect
              label="Kecamatan"
              value={filters.districtId || ''}
              options={getDistrictOptions()}
              onChange={(v) => handleFilterChange('districtId', v)}
            />
            <FilterSelect
              label="Desa/Kelurahan"
              value={filters.villageId || ''}
              options={getVillageOptions(filters.districtId || '')}
              onChange={(v) => handleFilterChange('villageId', v)}
              disabled={!filters.districtId}
            />\n<FilterSelect
              label="Status"
              value={filters.status || ''}
              options={[
                { value: 'active', label: 'Aktif' },
                { value: 'inactive', label: 'Tidak Aktif' },
                { value: 'suspended', label: 'Ditangguhkan' },
              ]}
              onChange={(v) => handleFilterChange('status', v as Member['status'] || undefined)}
            />
            <FilterSelect
              label="Verifikasi"
              value={filters.verificationStatus || ''}
              options={[
                { value: 'verified', label: 'Terverifikasi' },
                { value: 'pending', label: 'Pending' },
                { value: 'rejected', label: 'Ditolak' },
              ]}
              onChange={(v) => handleFilterChange('verificationStatus', v as Member['verificationStatus'] || undefined)}
            />
          </div>
        </div>
      )}

      {/* Content */}
      {status === 'loading' && members.length === 0 ? (
        <TableSkeleton rows={8} />
      ) : error ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-danger">{error}</p>
          <button onClick={refresh} className="btn-outline text-sm mt-3">Coba Lagi</button>
        </div>
      ) : members.length === 0 ? (
        <EmptyState
          icon={<User className="w-8 h-8 text-muted-foreground" />}
          title="Belum ada data anggota"
          description={searchInput ? `Tidak ditemukan hasil untuk "${searchInput}"` : 'Mulai tambahkan anggota pertama'}
          action={canAdd && !searchInput ? (
            <button onClick={() => navigate('/members/new')} className="btn-primary text-sm">
              <Plus className="w-4 h-4 inline mr-1" /> Tambah Anggota
            </button>
          ) : undefined}
        />
      ) : (
        <>
          {/* Member Cards (mobile) */}
          <div className="lg:hidden space-y-3">
            {members.map((m) => (
              <MemberCard key={m.memberId} member={m} showNIK={showNIK} />
            ))}
          </div>

          {/* Member Table (desktop) */}
          <div className="hidden lg:block card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Nama</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">NIK</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Jenis Kelamin</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Wilayah</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Verifikasi</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.memberId} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <button onClick={() => navigate(`/members/${m.memberId}`)} className="font-medium text-primary hover:text-accent transition-colors text-left">
                          {m.name}
                        </button>
                        {m.phone && <p className="text-xs text-muted-foreground mt-0.5">{m.phone}</p>}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">
                        {showNIK ? m.nikMasked : m.nikMasked}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={m.gender === 'L' ? 'text-blue-600' : 'text-pink-600'}>
                          {m.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-xs text-primary">{getVillageName(m.districtId, m.villageId)}</p>
                        <p className="text-[10px] text-muted-foreground">{getDistrictName(m.districtId)}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-block text-[11px] font-medium px-2.5 py-1 rounded-full ${STATUS_CONFIG[m.status].class}`}>
                          {STATUS_CONFIG[m.status].label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <VerifBadge status={m.verificationStatus} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="relative">
                          <button
                            onClick={() => setMenuOpenId(menuOpenId === m.memberId ? null : m.memberId)}
                            className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {menuOpenId === m.memberId && (
                            <MemberMenu
                              member={m}
                              canEdit={canEdit}
                              canDelete={canDelete}
                              onView={() => { navigate(`/members/${m.memberId}`); setMenuOpenId(null); }}
                              onEdit={() => { navigate(`/members/${m.memberId}/edit`); setMenuOpenId(null); }}
                              onDelete={() => { setDeleteTarget(m); setMenuOpenId(null); }}
                              onClose={() => setMenuOpenId(null)}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Load More */}
          {hasNextPage && (
            <div className="flex justify-center">
              <button onClick={loadMore} disabled={status === 'loading'} className="btn-outline text-sm flex items-center gap-2">
                {status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Muat Lebih Banyak
              </button>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Anggota"
        message={`Apakah Anda yakin ingin menghapus "${deleteTarget?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        variant="danger"
      />
    </div>
  );
}

function MemberCard({ member, showNIK }: { member: Member; showNIK: boolean }) {
  const navigate = useNavigate();
  const s = STATUS_CONFIG[member.status];
  return (
    <button
      onClick={() => navigate(`/members/${member.memberId}`)}
      className="card p-4 w-full text-left hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
          <User className="w-5 h-5 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-primary truncate">{member.name}</p>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${s.class}`}>{s.label}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {getVillageName(member.districtId, member.villageId)}, {getDistrictName(member.districtId)}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span className={`inline-flex items-center gap-1 text-[11px] ${VERIF_CONFIG[member.verificationStatus].class}`}>
              <BadgeCheck className="w-3 h-3" /> {VERIF_CONFIG[member.verificationStatus].label}
            </span>
            {member.phone && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Phone className="w-3 h-3" /> {member.phone}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function VerifBadge({ status }: { status: Member['verificationStatus'] }) {
  const cfg = VERIF_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${cfg.class}`}>
      <Icon className="w-3.5 h-3.5" />
      {cfg.label}
    </span>
  );
}

function FilterSelect({ label, value, options, onChange, disabled = false }: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="input-field h-10 text-sm disabled:opacity-50"
      >
        <option value="">Semua</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function MemberMenu({ member, canEdit, canDelete, onView, onEdit, onDelete, onClose }: {
  member: Member;
  canEdit: boolean;
  canDelete: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="absolute inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 top-full mt-1 w-44 bg-card rounded-xl border border-border shadow-lg py-1.5 z-20">
        <button onClick={onView} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-primary hover:bg-muted">
          <Eye className="w-4 h-4" /> Lihat Detail
        </button>
        {canEdit && (
          <button onClick={onEdit} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-primary hover:bg-muted">
            <Pencil className="w-4 h-4" /> Edit
          </button>
        )}
        {canDelete && (
          <button onClick={onDelete} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-danger hover:bg-muted">
            <Trash2 className="w-4 h-4" /> Hapus
          </button>
        )}
      </div>
    </>
  );
}

