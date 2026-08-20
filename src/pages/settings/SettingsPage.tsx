import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getLevelFromXP, getXPForNextLevel, LEVEL_THRESHOLDS } from '@/constants/roles';
import { getLevelTitle } from '@/services/cadres/cadreService';
import { BADGES, getBadgeById } from '@/constants/gamification';
import { getUserGamificationStats } from '@/services/gamification/gamificationService';
import {
  User, Moon, Sun, LogOut, Zap, Trophy, Award,
  Star, Loader2, Save, Smartphone,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, logout, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<{ totalQuizTaken: number; totalQuizPassed: number; totalRedemptions: number; pendingRedemptions: number; badges: string[] } | null>(null);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    if (user) {
      setName(user.displayName || '');
      setPhone(user.phone || '');
      getUserGamificationStats(user.uid).then(setStats).catch(() => {});
    }
  }, [user]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: name.trim() || user.displayName,
        phone: phone.trim(),
        updatedAt: Date.now(),
      });
      await refreshProfile();
      toast.success('Profil diperbarui');
    } catch {
      toast.error('Gagal memperbarui profil');
    }
    setSaving(false);
  }

  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('partaiapp_theme', next ? 'dark' : 'light');
  }

  const xp = user?.xp || 0;
  const level = getLevelFromXP(xp);
  const levelInfo = getXPForNextLevel(level);
  const progress = levelInfo.required > levelInfo.current
    ? ((xp - levelInfo.current) / (levelInfo.required - levelInfo.current)) * 100
    : 100;

  const userBadges = stats?.badges || [];

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-20 lg:pb-6">
      <h2 className="text-xl font-bold text-primary">Pengaturan</h2>

      {/* Profile Card */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center">
            <span className="text-2xl font-bold text-accent">Lv.{level}</span>
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-primary">{user?.displayName}</h3>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
            <p className="text-xs text-accent font-medium mt-0.5">{getLevelTitle(level)}</p>
          </div>
        </div>

        {/* XP Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Level {level}</span>
            <span className="text-muted-foreground">{xp.toLocaleString()} XP</span>
          </div>
          <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${Math.min(100, progress)}%` }} />
          </div>
          <p className="text-[10px] text-muted-foreground text-right">{levelInfo.required.toLocaleString()} XP untuk Level {level + 1}</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-muted/50 rounded-lg p-2.5 text-center">
            <Trophy className="w-4 h-4 text-amber-500 mx-auto" />
            <p className="text-sm font-bold text-primary mt-1">{stats?.totalQuizPassed || 0}</p>
            <p className="text-[10px] text-muted-foreground">Kuis Lulus</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2.5 text-center">
            <Award className="w-4 h-4 text-purple-500 mx-auto" />
            <p className="text-sm font-bold text-primary mt-1">{userBadges.length}</p>
            <p className="text-[10px] text-muted-foreground">Badge</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2.5 text-center">
            <Zap className="w-4 h-4 text-accent mx-auto" />
            <p className="text-sm font-bold text-primary mt-1">{xp.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Total XP</p>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-primary">Badge Saya</h3>
        {userBadges.length === 0 ? (
          <p className="text-xs text-muted-foreground">Belum ada badge. Selesaikan misi untuk mendapatkan badge!</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {userBadges.map(badgeId => {
              const badge = getBadgeById(badgeId);
              if (!badge) return null;
              return (
                <div key={badge.id} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2" title={badge.description}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: badge.color + '20' }}>
                    <Star className="w-4 h-4" style={{ color: badge.color }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-primary">{badge.title}</p>
                    <p className="text-[10px] text-muted-foreground">{badge.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* All Badges Preview */}
        <details className="pt-2">
          <summary className="text-xs text-accent cursor-pointer hover:underline">Lihat semua badge</summary>
          <div className="flex flex-wrap gap-2 mt-3">
            {BADGES.map(badge => {
              const earned = userBadges.includes(badge.id);
              return (
                <div key={badge.id} className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 ${earned ? 'bg-muted/50' : 'bg-muted/30 opacity-40'}`}>
                  <Star className="w-3.5 h-3.5" style={{ color: badge.color }} />
                  <span className="text-[10px] text-primary">{badge.title}</span>
                </div>
              );
            })}
          </div>
        </details>
      </div>

      {/* Edit Profile */}
      <div className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
          <User className="w-4 h-4" />Profil
        </h3>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-primary">Nama</label>
          <input value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="Nama lengkap" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-primary">No. Telepon</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} className="input-field" placeholder="08xxxxxxxxxx" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-primary">Email</label>
          <input value={user?.email || ''} disabled className="input-field opacity-50" />
          <p className="text-[10px] text-muted-foreground">Email tidak dapat diubah</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </div>

      {/* Appearance */}
      <div className="card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
          <Sun className="w-4 h-4" />Tampilan
        </h3>
        <button onClick={toggleDark} className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
          <div className="flex items-center gap-3">
            {dark ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-amber-500" />}
            <span className="text-sm text-primary">Mode {dark ? 'Gelap' : 'Terang'}</span>
          </div>
          <div className={`w-10 h-6 rounded-full transition-colors ${dark ? 'bg-accent' : 'bg-border'}`}>
            <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${dark ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
        </button>
      </div>

      {/* About & Logout */}
      <div className="card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
          <Smartphone className="w-4 h-4" />Tentang
        </h3>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>PartaiApp v1.0.0</p>
          <p>Platform Manajemen Organisasi</p>
          <p>Kabupaten Kepulauan Meranti, Riau</p>
        </div>
        <button onClick={logout} className="btn-danger w-full flex items-center justify-center gap-2 mt-3">
          <LogOut className="w-4 h-4" />Keluar
        </button>
      </div>
    </div>
  );
}
