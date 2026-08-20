import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import CadresPage from '@/pages/cadres/CadresPage';
import KaderDetailPage from '@/pages/cadres/KaderDetailPage';
import ActivitiesPage from '@/pages/activities/ActivitiesPage';
import AuditPage from '@/pages/audit/AuditPage';
import StatisticsPage from '@/pages/statistics/StatisticsPage';
import MapPage from '@/pages/map/MapPage';
import ScanPage from '@/pages/verification/ScanPage';
import SheetsPage from '@/pages/integration/SheetsPage';
import QuizPage from '@/pages/quiz/QuizPage';
import LeaderboardPage from '@/pages/leaderboard/LeaderboardPage';
import RewardsPage from '@/pages/rewards/RewardsPage';
import NotificationsPage from '@/pages/notifications/NotificationsPage';
import SettingsPage from '@/pages/settings/SettingsPage';
import KaderDashboardPage from '@/pages/kader/KaderDashboardPage';

export default function App() {
  return (
    <HashRouter>
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
            <Route path="cadres" element={<CadresPage />} />
            <Route path="cadres/:id" element={<KaderDetailPage />} />
            <Route path="regions" element={<RegionsPage />} />
            <Route path="map" element={<MapPage />} />
            <Route path="statistics" element={<StatisticsPage />} />
            <Route path="activities" element={<ActivitiesPage />} />
            <Route path="verification" element={<ScanPage />} />
            <Route path="quiz" element={<QuizPage />} />
            <Route path="leaderboard" element={<LeaderboardPage />} />
            <Route path="rewards" element={<RewardsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="audit" element={<AuditPage />} />
            <Route path="sheets" element={<SheetsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="kader" element={<KaderDashboardPage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
}


