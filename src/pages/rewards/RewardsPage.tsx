import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getActiveRewards, redeemReward, getMyRedemptions,
  getAllRedemptions, processRedemption, getAllRewards,
  createReward, updateReward, deleteReward,
} from '@/services/gamification/gamificationService';
import { getRewardCategoryLabel, REWARD_CATEGORIES } from '@/constants/gamification';
import type { Reward, RewardRedemption } from '@/types';
import {
  Gift, Zap, Loader2, Package, CheckCircle2,
  Plus, Pencil, Trash2, Ban, Truck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

type Tab = 'catalog' | 'my_redemptions' | 'manage';

export default function RewardsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin_kabupaten';
  const [tab, setTab] = useState<Tab>('catalog');
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [confirmReward, setConfirmReward] = useState<Reward | null>(null);
  const [adminRedemptions, setAdminRedemptions] = useState<RewardRedemption[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Admin form state
  const [showForm, setShowForm] = useState(false);
  const [editReward, setEditReward] = useState<Reward | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState('merchandise');
  const [formCost, setFormCost] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formSaving, setFormSaving] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Reward | null>(null);

  const loadRewards = useCallback(async () => {
    setLoading(true);
    try {
      const data = isAdmin ? await getAllRewards() : await getActiveRewards();
      setRewards(data);
    } catch { /* */ }
    setLoading(false);
  }, [isAdmin]);

  const loadRedemptions = useCallback(async () => {
    if (!user) return;
    try {
      if (isAdmin) {
        setAdminRedemptions(await getAllRedemptions());
      } else {
        setRedemptions(await getMyRedemptions(user.uid));
      }
    } catch { /* */ }
  }, [user, isAdmin]);

  useEffect(() => { loadRewards(); }, [loadRewards]);
  useEffect(() => { if (tab === 'my_redemptions' || tab === 'manage') loadRedemptions(); }, [tab, loadRedemptions]);

  async function handleRedeem(reward: Reward) {
    if (!user) return;
    setRedeeming(reward.rewardId);
    try {
      await redeemReward(reward.rewardId, user.uid);
      toast.success('Penukaran berhasil diajukan!');
      setConfirmReward(null);
      loadRedemptions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menukar hadiah');
    }
    setRedeeming(null);
  }

  async function handleProcessRedemption(redemptionId: string, status: 'approved' | 'rejected' | 'fulfilled') {
    if (!user) return;
    setProcessingId(redemptionId);
    try {
      await processRedemption(redemptionId, status, user.uid);
      toast.success('Berhasil diproses');
      loadRedemptions();
    } catch (err) {
      toast.error('Gagal memproses');
    }
    setProcessingId(null);
  }

  function openForm(reward?: Reward) {
    if (reward) {
      setEditReward(reward);
      setFormTitle(reward.title);
      setFormDesc(reward.description);
      setFormCategory(reward.category);
      setFormCost(String(reward.xpCost));
      setFormStock(String(reward.stock));
    } else {
      setEditReward(null);
      setFormTitle('');
      setFormDesc('');
      setFormCategory('merchandise');
      setFormCost('');
      setFormStock('');
    }
    setShowForm(true);
  }

  async function handleSaveReward() {
    if (!user || !formTitle.trim() || !formCost) { toast.error('Lengkapi data'); return; }
    setFormSaving(true);
    try {
      const data = {
        title: formTitle.trim(),
        description: formDesc.trim(),
        category: formCategory,
        xpCost: parseInt(formCost) || 0,
        stock: parseInt(formStock) || 0,
        imageUrl: '',
        active: true,
      };
      if (editReward) {
        await updateReward(editReward.rewardId, data, user.uid);
        toast.success('Hadiah diperbarui');
      } else {
        await createReward(data as Omit<Reward, 'rewardId' | 'createdAt' | 'updatedAt'>, user.uid);
        toast.success('Hadiah ditambahkan');
      }
      setShowForm(false);
      loadRewards();
    } catch (err) {
      toast.error('Gagal menyimpan');
    }
    setFormSaving(false);
  }

  async function handleDeleteReward() {
    if (!user || !deleteTarget) return;
    try {
      await deleteReward(deleteTarget.rewardId, user.uid);
      toast.success('Hadiah dihapus');
      setDeleteTarget(null);
      loadRewards();
    } catch { toast.error('Gagal menghapus'); }
  }

  function getRedemptionStatusLabel(s: RewardRedemption['status']) {
    switch (s) {
      case 'pending': return { label: 'Menunggu', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' };
      case 'approved': return { label: 'Disetujui', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' };
      case 'fulfilled': return { label: 'Dikirim', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' };
      case 'rejected': return { label: 'Ditolak', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' };
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-20 lg:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-primary">Reward</h2>
          <p className="text-sm text-muted-foreground">Tukarkan XP dengan hadiah</p>
        </div>
        {user && (
          <div className="flex items-center gap-1.5 bg-accent/10 px-3 py-1.5 rounded-xl">
            <Zap className="w-4 h-4 text-accent" />
            <span className="text-sm font-bold text-accent">{(user.xp || 0).toLocaleString()}</span>
            <span className="text-[10px] text-accent/70">XP</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {([
          ['catalog', 'Katalog'],
          ['my_redemptions', 'Riwayat'],
          ...(isAdmin ? [['manage', 'Kelola'] as const] : []),
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`h-9 px-3.5 rounded-xl text-xs font-medium transition-colors ${
              tab === key ? 'bg-accent text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >{label}</button>
        ))}
      </div>

      {/* CATALOG */}
      {tab === 'catalog' && (
        loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-accent animate-spin" /></div>
        ) : rewards.length === 0 ? (
          <div className="card p-8 text-center">
            <Gift className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Belum ada hadiah tersedia</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {rewards.map(reward => (
              <div key={reward.rewardId} className="card p-4 space-y-3">
                <div className="w-full h-24 rounded-lg bg-muted flex items-center justify-center">
                  <Package className="w-10 h-10 text-muted-foreground" />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">{getRewardCategoryLabel(reward.category)}</span>
                    <span className="text-[10px] text-muted-foreground">Stok: {reward.stock}</span>
                  </div>
                  <p className="text-sm font-semibold text-primary mt-1">{reward.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{reward.description}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Zap className="w-4 h-4 text-accent" />
                    <span className="text-sm font-bold text-accent">{reward.xpCost.toLocaleString()} XP</span>
                  </div>
                  <button
                    onClick={() => setConfirmReward(reward)}
                    disabled={(user?.xp || 0) < reward.xpCost || reward.stock <= 0}
                    className="btn-primary text-xs h-8 px-3"
                  >{reward.stock <= 0 ? 'Habis' : 'Tukar'}</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* MY REDEMPTIONS */}
      {tab === 'my_redemptions' && !isAdmin && (
        redemptions.length === 0 ? (
          <div className="card p-8 text-center">
            <Gift className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Belum ada riwayat penukaran</p>
          </div>
        ) : (
          <div className="space-y-2">
            {redemptions.map(r => {
              const st = getRedemptionStatusLabel(r.status);
              return (
                <div key={r.redemptionId} className="card p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Gift className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary truncate">{r.rewardTitle}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{r.xpCost.toLocaleString()} XP</span>
                      <span className="text-xs text-muted-foreground">{new Date(r.requestedAt).toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${st.cls}`}>{st.label}</span>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ADMIN MANAGE */}
      {tab === 'manage' && isAdmin && (
        <>
          <button onClick={() => openForm()} className="btn-primary flex items-center gap-2 w-full sm:w-auto">
            <Plus className="w-4 h-4" />Tambah Hadiah
          </button>

          {adminRedemptions.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-primary">Permintaan Penukaran</h3>
              {adminRedemptions.filter(r => r.status === 'pending').map(r => (
                <div key={r.redemptionId} className="card p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-primary">{r.rewardTitle}</p>
                    <span className="text-xs text-muted-foreground">{new Date(r.requestedAt).toLocaleDateString('id-ID')}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">User ID: {r.userId.slice(0, 12)}... · {r.xpCost.toLocaleString()} XP</p>
                  <div className="flex gap-2">
                    <button onClick={() => handleProcessRedemption(r.redemptionId, 'approved')} disabled={processingId === r.redemptionId} className="btn-outline text-xs h-8 flex-1 flex items-center justify-center gap-1">
                      {processingId === r.redemptionId ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}Setujui
                    </button>
                    <button onClick={() => handleProcessRedemption(r.redemptionId, 'fulfilled')} disabled={processingId === r.redemptionId} className="btn-outline text-xs h-8 flex-1 flex items-center justify-center gap-1">
                      <Truck className="w-3 h-3" />Tandai Dikirim
                    </button>
                    <button onClick={() => handleProcessRedemption(r.redemptionId, 'rejected')} disabled={processingId === r.redemptionId} className="btn-outline text-xs h-8 text-danger flex items-center justify-center gap-1">
                      <Ban className="w-3 h-3" />Tolak
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* All rewards list with edit/delete */}
          <div className="space-y-2">
            {rewards.map(reward => (
              <div key={reward.rewardId} className="card p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                  <Package className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary truncate">{reward.title}</p>
                  <p className="text-xs text-muted-foreground">{reward.xpCost} XP · Stok: {reward.stock} · {getRewardCategoryLabel(reward.category)}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${reward.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{reward.active ? 'Aktif' : 'Nonaktif'}</span>
                <button onClick={() => openForm(reward)} className="p-1.5 rounded-lg hover:bg-muted"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
                <button onClick={() => setDeleteTarget(reward)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4 text-red-500" /></button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Confirm Redemption Modal */}
      <Modal open={!!confirmReward} onClose={() => setConfirmReward(null)} title="Konfirmasi Penukaran">
        {confirmReward && (
          <div className="space-y-4">
            <p className="text-sm text-primary">Anda akan menukar <strong>{confirmReward.xpCost.toLocaleString()} XP</strong> untuk:</p>
            <div className="bg-muted/50 rounded-xl p-3">
              <p className="text-sm font-semibold text-primary">{confirmReward.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{confirmReward.description}</p>
            </div>
            <p className="text-xs text-muted-foreground">Sisa XP Anda: {((user?.xp || 0) - confirmReward.xpCost).toLocaleString()}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmReward(null)} className="btn-outline flex-1">Batal</button>
              <button onClick={() => handleRedeem(confirmReward)} disabled={redeeming === confirmReward.rewardId} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {redeeming === confirmReward.rewardId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Tukar Sekarang
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reward Form Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editReward ? 'Edit Hadiah' : 'Tambah Hadiah'}>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-primary">Nama Hadiah</label>
            <input value={formTitle} onChange={e => setFormTitle(e.target.value)} className="input-field" placeholder="Kaos Partai" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-primary">Deskripsi</label>
            <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} className="input-field min-h-[60px] resize-none" placeholder="Deskripsi hadiah..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-primary">Kategori</label>
              <select value={formCategory} onChange={e => setFormCategory(e.target.value)} className="input-field">
                {REWARD_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-primary">Stok</label>
              <input type="number" value={formStock} onChange={e => setFormStock(e.target.value)} className="input-field" placeholder="10" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-primary">Harga (XP)</label>
            <input type="number" value={formCost} onChange={e => setFormCost(e.target.value)} className="input-field" placeholder="500" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowForm(false)} className="btn-outline flex-1">Batal</button>
            <button onClick={handleSaveReward} disabled={formSaving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {formSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editReward ? 'Simpan' : 'Tambah'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteReward}
        title="Hapus Hadiah?"
        message={`Hadiah "${deleteTarget?.title}" akan dihapus permanen.`}
        confirmLabel="Hapus"
        variant="danger"
      />
    </div>
  );
}
