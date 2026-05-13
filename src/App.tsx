import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuthStore } from '@/store/authStore';
import { useYearStore } from '@/store/yearStore';
import { LoginPage } from '@/pages/Login';
import { OnboardingPage } from '@/pages/Onboarding';
import { DashboardPage } from '@/pages/Dashboard';
import { SalaryInputPage } from '@/pages/SalaryInput';
import { DeductionInputPage } from '@/pages/DeductionInput';
import { ResultPage } from '@/pages/Result';
import { ComparisonPage } from '@/pages/Comparison';
import { TopBar } from '@/components/layout/TopBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { hasCompletedOnboarding } from '@/utils/onboarding';
import { useDataStore } from '@/store/dataStore';

function ProtectedShell({ children }: { children: React.ReactNode }) {
  const profile = useAuthStore((s) => s.currentProfile);
  const loading = useAuthStore((s) => s.loading);
  const data = useDataStore((s) => s.data);
  const year = useYearStore((s) => s.year);
  const loadData = useDataStore((s) => s.load);
  const location = useLocation();

  useEffect(() => {
    if (profile) void loadData(profile.key, year);
  }, [profile, year, loadData]);

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
        <Spin />
      </div>
    );
  }
  if (!profile) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // First-time onboarding: empty salary data + not marked completed → redirect
  if (data && location.pathname !== '/onboarding') {
    const hasAnySalary = data.salaries.some((s) => s.grossPay > 0);
    if (!hasAnySalary && !hasCompletedOnboarding(profile.key)) {
      return <Navigate to="/onboarding" replace />;
    }
  }

  return (
    <div className="app-shell">
      <TopBar />
      <main className="app-main">{children}</main>
      <BottomNav />
    </div>
  );
}

function OnboardingShell({ children }: { children: React.ReactNode }) {
  const profile = useAuthStore((s) => s.currentProfile);
  const loading = useAuthStore((s) => s.loading);
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
        <Spin />
      </div>
    );
  }
  if (!profile) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

export function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const bootstrapYear = useYearStore((s) => s.bootstrap);

  useEffect(() => {
    bootstrapYear();
    void bootstrap();
  }, [bootstrap, bootstrapYear]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/onboarding"
          element={
            <OnboardingShell>
              <OnboardingPage />
            </OnboardingShell>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedShell>
              <DashboardPage />
            </ProtectedShell>
          }
        />
        <Route
          path="/salary"
          element={
            <ProtectedShell>
              <SalaryInputPage />
            </ProtectedShell>
          }
        />
        <Route
          path="/deduction"
          element={
            <ProtectedShell>
              <DeductionInputPage />
            </ProtectedShell>
          }
        />
        <Route
          path="/result"
          element={
            <ProtectedShell>
              <ResultPage />
            </ProtectedShell>
          }
        />
        <Route
          path="/comparison"
          element={
            <ProtectedShell>
              <ComparisonPage />
            </ProtectedShell>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
