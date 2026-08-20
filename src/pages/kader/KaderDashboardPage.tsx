import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getUserGamificationStats, getUnreadCount } from '@/services/gamification/gamificationService';
import { getLevelFromXP, getXPForNextLevel } from '@/constants/roles';
import { getLevelTitle } from '@/services/cadres/cadreService';
import { BADGES, getBadgeById, XP_REWARDS, XP_REWARD_LABELS, type XPRewardKey } from '@/constants/gamification';
import { getDistrictName, getVillageName } from '@/constants/regions';
import {
  Users, Zap, Trophy, BookOpen, Gift, Bell, Star, Award,
  Plus, ScanLine, ChevronRight, Flame,
} from 'lucide-react';

export default function KaderDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<{ totalQuizTaken: number; totalQuizPassed: number; totalRedemptions: number; pendingRedemptions: number; badges: string[] } | null>(null);
  const [unread, setUnread] = useState(0);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [s, u] = await Promise.all([getUserGamificationStats(user.uid), getUnreadCount(user.uid)]);
      setStats(s);
      setUnread(u);
    } catch { /* */ }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const xp = user?.xp || 0;
  const level = getLevelFromXP(xp);
  const levelInfo = getXPForNextLevel(level);
  const range = levelInfo.required - levelInfo.current;
  const progress = range > 0 ? ((xp - levelInfo.current) / range) * 100 : 100;
  const userBadges = stats?.badges || [];

  const quickActions = [
    { label: 'Tambah Anggota', icon: Plus, path: '/members/new', color: 'bg-blue-500/10 text-blue-600' },
    { label: 'Scan KTP', icon: ScanLine, path: '/verification?redirect=/members/new', color: 'bg-purple-500/10 text-purple-600' },
    { label: 'Kuis', icon: BookOpen, path: '/quiz', color: 'bg-amber-500/10 text-amber-600' },
    { label: 'Reward', icon: Gift, path: '/rewards', color: 'bg-emerald-500/10 text-emerald-600' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-20 lg:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-primary">Halo, {user?.displayName?.split(' ')[0]}!</h2>
          <p className="text-xs text-muted-foreground">
            {user?.districtId ? getDistrictName(user.districtId) : 'Kader'}
            {user?.villageId ? ` · ${getVillageName(user.districtId || '', user.villageId)}` : ''}
          </p>
        </div>
        <button onClick={() => navigate('/notifications')} className="relative w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center">
          <Bell className="w-5 h-5 text-muted-foreground" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">{unread > 9 ? '9+' : unread}</span>
          )}
        </button>
      </div>

      {/* Level Card */}
      <div className="card p-5 space-y-3 border-accent/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center">
              <span className="text-xl font-bold text-accent">{level}</span>
            </div>
            <div>
              <p className="text-sm font-bold text-primary">{getLevelTitle(level)}</p>
              <p className="text-xs text-muted-foreground">Level {level}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-accent flex items-center gap-1"><Zap className="w-4 h-4" />{xp.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Total XP</p>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Level {level}</span>
            <span>{Math.min(100, Math.round(progress))}% ke Level {level + 1}</span>
          </div>
          <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${Math.min(100, progress)}%` }} />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-2">
        {quickActions.map(action => (
          <button key={action.path} onClick={() => navigate(action.path)} className="card p-3 flex flex-col items-center gap-2 hover:border-accent/50 transition-colors">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${action.color}`}>
              <action.icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium text-primary text-center leading-tight">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="card p-3 text-center">
          <Trophy className="w-5 h-5 text-amber-500 mx-auto" />
          <p className="text-lg font-bold text-primary mt-1">{stats?.totalQuizPassed || 0}</p>
          <p className="text-[10px] text-muted-foreground">Kuis Lulus</p>
        </div>
        <div className="card p-3 text-center">
          <Award className="w-5 h-5 text-purple-500 mx-auto" />
          <p className="text-lg font-bold text-primary mt-1">{userBadges.length}</p>
          <p className="text-[10px] text-muted-foreground">Badge</p>
        </div>
        <div className="card p-3 text-center">
          <Gift className="w-5 h-5 text-emerald-500 mx-auto" />
          <p className="text-lg font-bold text-primary mt-1">{stats?.totalRedemptions || 0}</p>
          <p className="text-[10px] text-muted-foreground">Reward</p>
        </div>
      </div>

      {/* Recent Badges */}
      {userBadges.length > 0 && (
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-primary">Badge Terbaru</h3>
            <button onClick={() => navigate('/settings')} className="text-xs text-accent">Lihat semua</button>
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1">
            {userBadges.slice(-5).reverse().map(badgeId => {
              const badge = getBadgeById(badgeId);
              if (!badge) return null;
              return (
                <div key={badge.id} className="flex-shrink-0 flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: badge.color + '20' }}>
                    <Star className="w-4 h-4" style={{ color: badge.color }} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-primary">{badge.title}</p>
                    <p className="text-[10px] text-muted-foreground">{badge.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* XP Guide */}
      <div className="card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
          <Flame className="w-4 h-4 text-accent" />Cara Dapat XP
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(Object.entries(XP_REWARDS) as [XPRewardKey, number][]).map(([key, amount]) => (
            <div key={key} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
              <span className="text-xs text-primary">{XP_REWARD_LABELS[key]}</span>
              <span className="text-xs font-bold text-accent">+{amount} XP</span>
            </div>
          ))}
        </div>
      </div>

      {/* Navigate to Leaderboard */}
      <button onClick={() => navigate('/leaderboard')} className="card p-4 w-full flex items-center gap-4 hover:border-accent/50 transition-colors">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-amber-500" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-primary">Leaderboard</p>
          <p className="text-xs text-muted-foreground">Lihat peringkat kader terbaik</p>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </button>
    </div>
  );
}
