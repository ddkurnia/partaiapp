import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getNotifications, markNotificationRead, markAllRead,
} from '@/services/gamification/gamificationService';
import type { Notification } from '@/types';
import {
  Bell, BellOff, CheckCheck, Info, AlertTriangle, CheckCircle2, Gift, Star,
  Loader2, Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';

function getNotifIcon(type: Notification['type']) {
  switch (type) {
    case 'info': return <Info className="w-5 h-5 text-blue-500" />;
    case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    case 'success': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    case 'reward': return <Gift className="w-5 h-5 text-purple-500" />;
    case 'level_up': return <Star className="w-5 h-5 text-amber-500" />;
  }
}

function getTimeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'Baru saja';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} hari lalu`;
  return new Date(ts).toLocaleDateString('id-ID');
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try { setNotifications(await getNotifications(user.uid, 50)); } catch { /* */ }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  async function handleMarkRead(id: string) {
    await markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.notificationId === id ? { ...n, read: true } : n));
  }

  async function handleMarkAllRead() {
    if (!user) return;
    await markAllRead(user.uid);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.success('Semua ditandai sudah dibaca');
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-20 lg:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-primary">Notifikasi</h2>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} belum dibaca` : 'Tidak ada notifikasi baru'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="btn-outline text-xs h-9 px-3 flex items-center gap-1.5">
            <CheckCheck className="w-3.5 h-3.5" />Tandai Semua
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-accent animate-spin" /></div>
      ) : notifications.length === 0 ? (
        <div className="card p-8 text-center">
          <BellOff className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-base font-semibold text-primary">Tidak ada notifikasi</h3>
          <p className="text-sm text-muted-foreground mt-1">Notifikasi akan muncul saat ada aktivitas baru</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(notif => (
            <button
              key={notif.notificationId}
              onClick={() => !notif.read && handleMarkRead(notif.notificationId)}
              className={`card p-3.5 w-full text-left flex items-start gap-3 transition-all hover:border-accent/30 ${
                !notif.read ? 'border-accent/20 bg-accent/5' : ''
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                {getNotifIcon(notif.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm ${!notif.read ? 'font-semibold' : 'font-medium'} text-primary`}>{notif.title}</p>
                  {!notif.read && <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-1.5" />}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.body}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{getTimeAgo(notif.createdAt)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
