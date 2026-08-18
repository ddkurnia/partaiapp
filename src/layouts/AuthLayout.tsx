import { type ReactNode } from 'react';
import { Logo } from '@/components/ui/Logo';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-muted flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar text-sidebar-foreground flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(16,185,129,0.15),transparent_60%)]" />
        <div className="relative z-10">
          <Logo />
        </div>
        <div className="relative z-10 space-y-6">
          <h2 className="text-3xl font-bold leading-tight">
            Platform Manajemen
            <br />
            <span className="text-accent">Organisasi Modern</span>
          </h2>
          <p className="text-sidebar-foreground/60 max-w-md">
            Sistem pendataan anggota, pengelolaan kader, dan analitik wilayah
            untuk Kabupaten Kepulauan Meranti.
          </p>
        </div>
        <div className="relative z-10 text-xs text-sidebar-foreground/30">
          &copy; {new Date().getFullYear()} PartaiApp. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex justify-center">
            <Logo />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}