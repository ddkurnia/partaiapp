import { useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessRoute } from '@/utils/permissions';
import { MAIN_NAV, MORE_NAV } from '@/constants/navigation';
import { Logo } from '@/components/ui/Logo';
import { UserMenu } from '@/components/ui/UserMenu';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import {
  Menu,
  X,
  ChevronLeft,
  LayoutDashboard,
  Bell,
} from 'lucide-react';

export function DashboardLayout() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();

  const visibleMainNav = MAIN_NAV.filter(item =>
    user && canAccessRoute(user.role, item.roles),
  );
  const visibleMoreNav = MORE_NAV.filter(item =>
    user && canAccessRoute(user.role, item.roles),
  );

  const currentPage = [...MAIN_NAV, ...MORE_NAV].find(n => n.path === location.pathname);

  return (
    <div className="min-h-screen bg-muted flex">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Desktop */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full bg-sidebar text-sidebar-foreground
          flex flex-col transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          ${sidebarCollapsed ? 'w-[72px]' : 'w-64'}
        `}
      >
        <div className={`flex items-center justify-between px-4 h-16 border-b border-white/10 flex-shrink-0 ${sidebarCollapsed ? 'justify-center' : ''}`}>
          <Logo collapsed={sidebarCollapsed} />
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex w-8 h-8 rounded-lg items-center justify-center hover:bg-white/10"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-thin">
          <div className="space-y-1">
            {visibleMainNav.map((item) => (
              <SidebarNavLink key={item.path} item={item} collapsed={sidebarCollapsed} onClick={() => setSidebarOpen(false)} />
            ))}
          </div>

          {visibleMoreNav.length > 0 && (
            <>
              <div className="my-4 border-t border-white/10" />
              <p className={`text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/40 mb-2 ${sidebarCollapsed ? 'text-center' : 'px-3'}`}>
                {sidebarCollapsed ? '···' : 'Lainnya'}
              </p>
              <div className="space-y-1">
                {visibleMoreNav.map((item) => (
                  <SidebarNavLink key={item.path} item={item} collapsed={sidebarCollapsed} onClick={() => setSidebarOpen(false)} />
                ))}
              </div>
            </>
          )}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <UserMenu />
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-64'} `}>
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-md border-b border-border h-16 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center hover:bg-muted transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-semibold text-primary">
                {currentPage?.label || 'Dashboard'}
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Kabupaten Kepulauan Meranti
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-muted transition-colors relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>

        {/* Bottom Navigation Mobile */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border px-2 pb-[env(safe-area-inset-bottom)]">
          <div className="flex justify-around py-2">
            {visibleMainNav.slice(0, 5).map((item) => (
              <MobileNavLink key={item.path} item={item} />
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}

function SidebarNavLink({
  item,
  collapsed,
  onClick,
}: {
  item: { label: string; path: string; icon: React.ComponentType<{ className?: string }> };
  collapsed: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      onClick={onClick}
      className={({ isActive }) => `
        flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
        transition-all duration-200 group
        ${isActive
          ? 'bg-accent text-white shadow-lg shadow-accent/25'
          : 'text-sidebar-foreground/70 hover:bg-white/10 hover:text-sidebar-foreground'
        }
        ${collapsed ? 'justify-center' : ''}
      `}
      title={collapsed ? item.label : undefined}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  );
}

function MobileNavLink({
  item,
}: {
  item: { label: string; path: string; icon: React.ComponentType<{ className?: string }> };
}) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      className={({ isActive }) => `
        flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-medium
        transition-colors min-w-[56px]
        ${isActive
          ? 'text-accent'
          : 'text-muted-foreground'
        }
      `}
    >
      <Icon className="w-5 h-5" />
      <span className="truncate max-w-[64px]">{item.label}</span>
    </NavLink>
  );
}