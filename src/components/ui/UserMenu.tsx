import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ROLES } from '@/constants/roles';
import { LogOut, User, ChevronDown } from 'lucide-react';

export function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!user) return null;

  const roleInfo = ROLES[user.role];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted transition-colors w-full"
      >
        <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
          <span className="text-accent font-semibold text-sm">
            {user.displayName?.charAt(0).toUpperCase() || 'U'}
          </span>
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-medium text-primary truncate">{user.displayName}</p>
          <p className="text-xs text-muted-foreground truncate">{roleInfo.label}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-card rounded-xl border border-border shadow-lg py-2 z-50">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-medium text-primary">{user.displayName}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
            <span className="inline-block mt-1 text-[10px] font-medium bg-accent/10 text-accent px-2 py-0.5 rounded-full">
              {roleInfo.label}
            </span>
          </div>
          <button
            onClick={() => { setOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-primary hover:bg-muted transition-colors"
          >
            <User className="w-4 h-4" />
            Profil
          </button>
          <button
            onClick={async () => { setOpen(false); await logout(); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-danger hover:bg-muted transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>
      )}
    </div>
  );
}