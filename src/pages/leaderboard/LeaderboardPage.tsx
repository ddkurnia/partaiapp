import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getLeaderboard } from '@/services/gamification/gamificationService';
import { getLevelTitle } from '@/services/cadres/cadreService';
import { LEADERBOARD_PERIODS, type LeaderboardPeriod } from '@/constants/gamification';
import type { LeaderboardEntry } from '@/types';
import { Trophy, Medal, Loader2, MapPin, Users, Crown } from 'lucide-react';

function getRankIcon(rank: number) {
  if (rank === 1) return <Crown className="w-6 h-6 text-amber-500" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
  if (rank === 3) return <Medal className="w-5 h-5 text-amber-700" />;
  return <span className="text-sm font-bold text-muted-foreground w-6 text-center">{rank}</span>;
}

function getRankBg(rank: number) {
  if (rank === 1) return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
  if (rank === 2) return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700';
  if (rank === 3) return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
  return '';
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<LeaderboardPeriod>('alltime');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getLeaderboard(50);
      setEntries(data);
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const myEntry = entries.find(e => e.uid === user?.uid);
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-20 lg:pb-6">
      <div>
        <h2 className="text-xl font-bold text-primary">Leaderboard</h2>
        <p className="text-sm text-muted-foreground">Peringkat kader terbaik</p>
      </div>

      <div className="flex gap-2">
        {LEADERBOARD_PERIODS.map(p => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={`h-9 px-3.5 rounded-xl text-xs font-medium transition-colors ${
              period === p.id ? 'bg-accent text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >{p.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-accent animate-spin" /></div>
      ) : entries.length === 0 ? (
        <div className="card p-8 text-center">
          <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-base font-semibold text-primary">Belum ada data</h3>
          <p className="text-sm text-muted-foreground mt-1">Leaderboard akan muncul setelah kader mendapatkan XP</p>
        </div>
      ) : (
        <>
          {myEntry && (
            <div className="card p-4 border-accent/30 bg-accent/5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center font-bold text-accent">
                #{myEntry.rank}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-primary">{myEntry.displayName} (Anda)</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-muted-foreground">Level {myEntry.level} · {getLevelTitle(myEntry.level)}</span>
                  <span className="text-xs text-muted-foreground">{myEntry.xp.toLocaleString()} XP</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="w-3 h-3" />{myEntry.memberCount} anggota
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-accent">{myEntry.xp.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">XP</p>
              </div>
            </div>
          )}

          {top3.length >= 3 && (
            <div className="grid grid-cols-3 gap-2">
              {[top3[1], top3[0], top3[2]].map((entry, displayIdx) => {
                const isFirst = displayIdx === 1;
                return (
                  <div key={entry.uid} className={`card p-3 text-center ${getRankBg(entry.rank)} ${isFirst ? '-mt-2' : 'mt-4'}`}>
                    <div className={`mx-auto mb-2 rounded-full bg-muted flex items-center justify-center ${isFirst ? 'w-14 h-14' : 'w-10 h-10'}`}>
                      {getRankIcon(entry.rank)}
                    </div>
                    <p className="text-xs font-bold text-primary truncate">{entry.displayName}</p>
                    <p className="text-[10px] text-muted-foreground">Lv.{entry.level}</p>
                    <p className={`text-sm font-bold mt-1 ${isFirst ? 'text-amber-600' : 'text-primary'}`}>{entry.xp.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">XP</p>
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-2">
            {rest.map(entry => {
              const isMe = entry.uid === user?.uid;
              return (
                <div key={entry.uid} className={`card p-3 flex items-center gap-3 ${isMe ? 'border-accent/30 bg-accent/5' : ''}`}>
                  <div className="w-8 flex justify-center">{getRankIcon(entry.rank)}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium text-primary truncate ${isMe ? 'text-accent' : ''}`}>
                      {entry.displayName}{isMe ? ' (Anda)' : ''}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">Level {entry.level}</span>
                      {entry.districtName && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <MapPin className="w-2.5 h-2.5" />{entry.districtName}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Users className="w-2.5 h-2.5" />{entry.memberCount}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-primary">{entry.xp.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">XP</p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
