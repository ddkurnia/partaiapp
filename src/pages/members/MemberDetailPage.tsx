import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMember, deleteMember } from '@/services/members/memberService';
import { getDistrictName, getVillageName } from '@/constants/regions';
import { useAuth } from '@/contexts/AuthContext';
import type { Member } from '@/types';
import { Skeleton } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  ArrowLeft, Pencil, Trash2, User, MapPin, Phone,
  Calendar, Hash, Shield, ShieldCheck, ShieldAlert, BadgeCheck,
  Clock, FileText, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  active: { label: 'Aktif', class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  inactive: { label: 'Tidak Aktif', class: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  suspended: { label: 'Ditangguhkan', class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
} as const;

const VERIF_CONFIG = {
  verified: { label: 'Terverifikasi', icon: BadgeCheck, class: 'text-emerald-500' },
  pending: { label: 'Pending', icon: Shield, class: 'text-amber-500' },
  rejected: { label: 'Ditolak', icon: ShieldAlert, class: 'text-red-500' },
} as const;

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasMinRole } = useAuth();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canEdit = hasMinRole('admin_desa');
  const canDelete = hasMinRole('admin_kabupaten');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getMember(id)
      .then(setMember)
      .catch(() => toast.error('Gagal memuat data anggota'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!member || !user) return;
    setDeleting(true);
    try {
      await deleteMember(member.memberId, user.uid);
      toast.success('Anggota berhasil dihapus');
      navigate('/members');
    } catch {
      toast.error('Gagal menghapus');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <p className="text-muted-foreground">Anggota tidak ditemukan</p>
        <button onClick={() => navigate('/members')} className="btn-outline text-sm mt-4">Kembali ke Daftar</button>
      </div>
    );
  }

  const s = STATUS_CONFIG[member.status];
  const v = VERIF_CONFIG[member.verificationStatus];
  const VerifIcon = v.icon;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/members')} className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-primary">Detail Anggota</h2>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <button onClick={() => navigate(`/members/${member.memberId}/edit`)} className="btn-outline h-10 px-3 text-sm flex items-center gap-1.5">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
          )}
          {canDelete && (
            <button onClick={() => setShowDelete(true)} className="btn-danger h-10 px-3 text-sm flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5" /> Hapus
            </button>
          )}
        </div>
      </div>

      {/* Profile Card */}
      <div className="card p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center flex-shrink-0">
            <User className="w-8 h-8 text-accent" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-primary">{member.name}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">NIK: {member.nikMasked}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.class}`}>{s.label}</span>
              <span className={`inline-flex items-center gap-1 text-xs font-medium ${v.class}`}>
                <VerifIcon className="w-3.5 h-3.5" /> {v.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="card divide-y divide-border">
        <DetailRow icon={<User className="w-4 h-4" />} label="Nama Lengkap" value={member.name} />
        <DetailRow icon={<Hash className="w-4 h-4" />} label="NIK" value={member.nikMasked} mono />
        <DetailRow icon={<Calendar className="w-4 h-4" />} label="Tempat, Tanggal Lahir" value={`${member.birthPlace}, ${formatDate(member.birthDate)}`} />
        <DetailRow icon={<User className="w-4 h-4" />} label="Jenis Kelamin" value={member.gender === 'L' ? 'Laki-laki' : 'Perempuan'} />
        <DetailRow icon={<Phone className="w-4 h-4" />} label="Telepon" value={member.phone || '-'} />
        <DetailRow icon={<MapPin className="w-4 h-4" />} label="Wilayah" value={`${getVillageName(member.districtId, member.villageId)}, ${getDistrictName(member.districtId)}`} />
        <DetailRow icon={<FileText className="w-4 h-4" />} label="Alamat" value={member.address || '-'} />
        <DetailRow icon={<Clock className="w-4 h-4" />} label="Terdaftar" value={formatTimestamp(member.createdAt)} />
        <DetailRow icon={<Clock className="w-4 h-4" />} label="Diperbarui" value={formatTimestamp(member.updatedAt)} />
      </div>

      {/* Delete Dialog */}
      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Hapus Anggota"
        message={`Yakin ingin menghapus "${member.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}

function DetailRow({ icon, label, value, mono = false }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3 px-5 py-3.5">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 text-muted-foreground mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-sm font-medium text-primary mt-0.5 ${mono ? 'font-mono' : ''}`}>{value}</p>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return dateStr; }
}

function formatTimestamp(ts: number): string {
  if (!ts) return '-';
  return new Date(ts).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}