import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  getCadreDetail, updateCadreXP, createKaderTarget,
  deleteKaderTarget, getLevelTitle, getXPProgress, getMaxLevel,
} from '@/services/cadres/cadreService';
import { LEVEL_THRESHOLDS } from '@/constants/roles';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import type { KaderProfile, KaderTarget } from '@/types';
import {
  ArrowLeft, Star, Zap, Users, ShieldCheck, Target, BookOpen,
  Trophy, Plus, Trash2, Calendar, Award, TrendingUp, MapPin, Phone, Mail,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function KaderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasMinRole } = useAuth();
  const [kader, setKader] = useState<KaderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showXPModal, setShowXPModal] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [xpInput, setXpInput] = useState('');
  const [xpReason, setXpReason] = useState('');
  const [targetForm, setTargetForm] = useState({ period: '', targetMembers: '', targetVerified: '' });
  const [submitting, setSubmitting] = useState(false);

  const canManage = hasMinRole('admin_kabupaten');
  const maxLevel = getMaxLevel();

  useEffect(() => {
    if (!id) return;
    getCadreDetail(id).then(k => {
      setKader(k);
      setLoading(false);
    }).catch(() => {
      toast.error('Gagal memuat data kader');
      setLoading(false);
    });
  }, [id]);

  const handleAddXP = async () => {
    if (!user || !id || !xpInput) return;
    const xp = parseInt(xpInput);
    if (isNaN(xp) || xp <= 0) { toast.error('XP harus berupa angka positif'); return; }
    setSubmitting(true);
    try {
      await updateCadreXP(id, xp, xpReason || 'Penambahan manual', user.uid);
      toast.success(`+${xp} XP berhasil ditambahkan`);
      setShowXPModal(false);
      setXpInput('');
      setXpReason('');
      // Refresh
      const updated = await getCadreDetail(id);
      setKader(updated);
    } catch {
      toast.error('Gagal menambahkan XP');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateTarget = async () => {
    if (!user || !id || !targetForm.period || !targetForm.targetMembers) return;
    setSubmitting(true);
    try {
      await createKaderTarget({
        userId: id,
        period: targetForm.period,
        targetMembers: parseInt(targetForm.targetMembers),
        targetVerified: parseInt(targetForm.targetVerified) || 0,
      }, user.uid);
      toast.success('Target berhasil dibuat');
      setShowTargetModal(false);
      setTargetForm({ period: '', targetMembers: '', targetVerified: '' });
      const updated = await getCadreDetail(id);
      setKader(updated);
    } catch {
      toast.error('Gagal membuat target');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTarget = async (targetId: string) => {
    if (!user) return;
    try {
      await deleteKaderTarget(targetId, user.uid);
      toast.success('Target dihapus');
      if (id) {
        const updated = await getCadreDetail(id);
        setKader(updated);
      }
    } catch {
      toast.error('Gagal menghapus target');
    }
  };

  if (loading) {
    return <div className="space-y-4"><CardSkeleton /><CardSkeleton /><CardSkeleton /></div>;
  }

  if (!kader) {
    return <EmptyState title="Kader tidak ditemukan" />;
  }

  const xp = kader.xp || 0;
  const levelInfo = getXPProgress(xp, kader.level);
  const levelTitle = getLevelTitle(kader.level);
  const isMaxLevel = kader.level >= maxLevel;
  const progressPercent = isMaxLevel ? 100 : Math.min(100, ((xp - levelInfo.current) / (levelInfo.required - levelInfo.current)) * 100);
  const nextXP = levelInfo.required;

  return (
    <div className="space-y-5 pb-20 lg:pb-6">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/cadres')} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-primary">Detail Kader</h2>
        </div>
        {canManage && (
          <button onClick={() => setShowXPModal(true)} className="btn-primary text-sm flex items-center gap-2">
            <Zap className="w-4 h-4" /> Tambah XP
          </button>
        )}
      </div>

      {/* Profile Card */}
      <div className="card p-5">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center flex-shrink-0">
            <span className="text-accent font-bold text-2xl">{kader.displayName?.charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-primary">{kader.displayName}</h3>
            <p className="text-sm text-muted-foreground">Level {kader.level} — {levelTitle}</p>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
              {kader.districtName && (
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{kader.districtName}{kader.villageName ? `, ${kader.villageName}` : ''}</span>
              )}
              {kader.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{kader.phone}</span>}
              {kader.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{kader.email}</span>}
            </div>
          </div>
        </div>

        {/* XP Progress */}
        <div className="mt-5 p-4 rounded-xl bg-muted/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-primary">XP Progress</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {xp.toLocaleString('id-ID')} / {isMaxLevel ? 'MAX' : `${nextXP.toLocaleString('id-ID')} XP`}
            </span>
          </div>
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent via-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
            <span>Level {kader.level}</span>
            {isMaxLevel ? <span>Level Maksimum</span> : <span>Level {kader.level + 1}</span>}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <Users className="w-5 h-5 text-accent mx-auto mb-1" />
          <p className="text-xl font-bold text-primary">{kader.memberCount}</p>
          <p className="text-[11px] text-muted-foreground">Total Anggota</p>
        </div>
        <div className="card p-4 text-center">
          <ShieldCheck className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-primary">{kader.verifiedCount}</p>
          <p className="text-[11px] text-muted-foreground">Data Valid</p>
        </div>
        <div className="card p-4 text-center">
          <Trophy className="w-5 h-5 text-amber-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-primary">{xp.toLocaleString('id-ID')}</p>
          <p className="text-[11px] text-muted-foreground">Total XP</p>
        </div>
      </div>

      {/* Level History / Milestones */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-primary flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4" /> Perjalanan Level
        </h3>
        <div className="space-y-2">
          {LEVEL_THRESHOLDS.filter(t => t.level <= kader.level || t.level === kader.level + 1).map(t => {
            const reached = kader.level >= t.level;
            return (
              <div key={t.level} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${reached ? 'bg-accent/5' : 'opacity-40'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${reached ? 'bg-accent text-white' : 'bg-muted text-muted-foreground'}`}>
                  {reached ? <Star className="w-4 h-4" /> : t.level}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${reached ? 'text-primary' : 'text-muted-foreground'}`}>Level {t.level} — {getLevelTitle(t.level)}</p>
                  <p className="text-[10px] text-muted-foreground">{t.xpRequired.toLocaleString('id-ID')} XP</p>
                </div>
                {reached && <span className="text-[10px] text-accent font-medium">Tercapai</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Targets Section */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
            <Target className="w-4 h-4" /> Target Kader
          </h3>
          {canManage && (
            <button onClick={() => setShowTargetModal(true)} className="text-xs text-accent hover:underline flex items-center gap-1">
              <Plus className="w-3 h-3" /> Tambah Target
            </button>
          )}
        </div>
        {(!kader.targets || kader.targets.length === 0) ? (
          <EmptyState
            icon={<Target className="w-6 h-6 text-muted-foreground" />}
            title="Belum ada target"
            description="Target pendataan anggota akan ditampilkan di sini"
          />
        ) : (
          <div className="space-y-3">
            {kader.targets.map(t => (
              <TargetCard key={t.targetId} target={t} canDelete={canManage} onDelete={() => handleDeleteTarget(t.targetId)} />
            ))}
          </div>
        )}
      </div>

      {/* Training History */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-primary flex items-center gap-2 mb-4">
          <BookOpen className="w-4 h-4" /> Riwayat Pelatihan
        </h3>
        {(!kader.trainingHistory || kader.trainingHistory.length === 0) ? (
          <EmptyState
            icon={<BookOpen className="w-6 h-6 text-muted-foreground" />}
            title="Belum ada pelatihan"
            description="Riwayat pelatihan akan muncul setelah menyelesaikan quiz atau pelatihan"
          />
        ) : (
          <div className="space-y-2">
            {kader.trainingHistory.map(tr => (
              <div key={tr.trainingId} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${tr.type === 'quiz' ? 'bg-blue-500/10 text-blue-500' : tr.type === 'offline' ? 'bg-amber-500/10 text-amber-500' : 'bg-purple-500/10 text-purple-500'}`}>
                  {tr.type === 'quiz' ? <BookOpen className="w-4 h-4" /> : <Award className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary truncate">{tr.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" />{new Date(tr.completedAt).toLocaleDateString('id-ID')}
                    </span>
                    {tr.score != null && tr.maxScore != null && (
                      <span className="text-[10px] text-muted-foreground">Skor: {tr.score}/{tr.maxScore}</span>
                    )}
                  </div>
                </div>
                <span className="text-xs font-semibold text-amber-500 flex items-center gap-1">
                  <Zap className="w-3 h-3" />+{tr.xpEarned} XP
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add XP Modal */}
      <Modal open={showXPModal} onClose={() => setShowXPModal(false)} title="Tambah XP" size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Jumlah XP</label>
            <input
              type="number"
              min="1"
              value={xpInput}
              onChange={e => setXpInput(e.target.value)}
              placeholder="Contoh: 50"
              className="input-field h-11"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Alasan</label>
            <input
              type="text"
              value={xpReason}
              onChange={e => setXpReason(e.target.value)}
              placeholder="Contoh: Menyelesaikan pelatihan digital"
              className="input-field h-11"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowXPModal(false)} className="btn-outline text-sm">Batal</button>
            <button onClick={handleAddXP} disabled={submitting || !xpInput} className="btn-primary text-sm">
              {submitting ? 'Menyimpan...' : 'Tambah XP'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Target Modal */}
      <Modal open={showTargetModal} onClose={() => setShowTargetModal(false)} title="Buat Target" size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Periode</label>
            <input
              type="month"
              value={targetForm.period}
              onChange={e => setTargetForm(f => ({ ...f, period: e.target.value }))}
              className="input-field h-11"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Target Anggota Baru</label>
            <input
              type="number"
              min="1"
              value={targetForm.targetMembers}
              onChange={e => setTargetForm(f => ({ ...f, targetMembers: e.target.value }))}
              placeholder="Jumlah target"
              className="input-field h-11"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Target Verifikasi (opsional)</label>
            <input
              type="number"
              min="0"
              value={targetForm.targetVerified}
              onChange={e => setTargetForm(f => ({ ...f, targetVerified: e.target.value }))}
              placeholder="Jumlah target verifikasi"
              className="input-field h-11"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowTargetModal(false)} className="btn-outline text-sm">Batal</button>
            <button onClick={handleCreateTarget} disabled={submitting} className="btn-primary text-sm">
              {submitting ? 'Menyimpan...' : 'Buat Target'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function TargetCard({ target, canDelete, onDelete }: { target: KaderTarget; canDelete: boolean; onDelete: () => void }) {
  const memberPercent = target.targetMembers > 0 ? Math.min(100, Math.round((target.achievedMembers / target.targetMembers) * 100)) : 0;
  const verifiedPercent = target.targetVerified > 0 ? Math.min(100, Math.round((target.achievedVerified / target.targetVerified) * 100)) : 0;

  return (
    <div className="p-4 rounded-xl border border-border bg-card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-primary">{formatPeriod(target.period)}</span>
        </div>
        {canDelete && (
          <button onClick={onDelete} className="w-7 h-7 rounded-lg hover:bg-red-500/10 flex items-center justify-center text-muted-foreground hover:text-danger transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {/* Member Target */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">Anggota Baru</span>
          <span className="text-xs font-semibold text-primary">{target.achievedMembers}/{target.targetMembers} ({memberPercent}%)</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${memberPercent >= 100 ? 'bg-emerald-500' : 'bg-accent'}`} style={{ width: `${memberPercent}%` }} />
        </div>
      </div>
      {/* Verified Target */}
      {target.targetVerified > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Verifikasi</span>
            <span className="text-xs font-semibold text-primary">{target.achievedVerified}/{target.targetVerified} ({verifiedPercent}%)</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${verifiedPercent >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${verifiedPercent}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

function formatPeriod(period: string): string {
  if (!period || period.length < 7) return period;
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const m = parseInt(period.slice(5, 7));
  const y = period.slice(0, 4);
  return `${months[m - 1]} ${y}`;
}
