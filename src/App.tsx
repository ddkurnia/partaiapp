import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import LoginPage from '@/pages/auth/LoginPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import MemberListPage from '@/pages/members/MemberListPage';
import MemberFormPage from '@/pages/members/MemberFormPage';
import MemberDetailPage from '@/pages/members/MemberDetailPage';
import MemberEditPage from '@/pages/members/MemberEditPage';
import RegionsPage from '@/pages/regions/RegionsPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: '12px',
              fontSize: '14px',
              padding: '12px 16px',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Protected Dashboard Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />

            {/* Placeholder routes for future milestones */}
            <Route path="members" element={<MemberListPage />} />
            <Route path="members/new" element={<MemberFormPage />} />
            <Route path="members/:id" element={<MemberDetailPage />} />
            <Route path="members/:id/edit" element={<MemberEditPage />} />
            <Route path="cadres" element={<PlaceholderPage title="Kader" />} />
            <Route path="regions" element={<RegionsPage />} />
            <Route path="map" element={<PlaceholderPage title="Peta Wilayah" />} />
            <Route path="statistics" element={<PlaceholderPage title="Statistik" />} />
            <Route path="activities" element={<PlaceholderPage title="Aktivitas" />} />
            <Route path="verification" element={<PlaceholderPage title="Verifikasi" />} />
            <Route path="quiz" element={<PlaceholderPage title="Quiz" />} />
            <Route path="leaderboard" element={<PlaceholderPage title="Leaderboard" />} />
            <Route path="rewards" element={<PlaceholderPage title="Reward" />} />
            <Route path="notifications" element={<PlaceholderPage title="Notifikasi" />} />
            <Route path="audit" element={<PlaceholderPage title="Audit Log" />} />
            <Route path="settings" element={<PlaceholderPage title="Pengaturan" />} />
            <Route path="kader" element={<PlaceholderPage title="Beranda Kader" />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🚧</span>
        </div>
        <h2 className="text-lg font-semibold text-primary">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">Modul ini akan tersedia di milestone berikutnya.</p>
      </div>
    </div>
  );
}
