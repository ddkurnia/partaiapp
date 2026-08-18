export function Logo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
        <span className="text-white font-bold text-lg">P</span>
      </div>
      {!collapsed && (
        <div className="overflow-hidden">
          <h1 className="text-base font-bold text-sidebar-foreground leading-tight">PartaiApp</h1>
          <p className="text-[10px] text-sidebar-foreground/50 leading-tight">Manajemen Organisasi</p>
        </div>
      )}
    </div>
  );
}