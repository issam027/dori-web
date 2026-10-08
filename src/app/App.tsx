import { Navigate, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSessionStore } from '@/core/auth/session-store';
import { ProtectedRoute } from '@/core/permissions/ProtectedRoute';
import { findFirstAuthorizedPath, protectedRoutes } from '@/core/permissions/route-access';
import { useBrandStore } from '@/core/theme/brand-store';
import { AppProviders } from './AppProviders';
import { AppShell } from './layouts/AppShell';
import { ExperiencePreview } from './layouts/ExperiencePreview';
import { PublicExperienceLayout } from './layouts/PublicExperienceLayout';
import { LoginPage } from '@/features/auth/LoginPage';
import { ChangePasswordPage } from '@/features/auth/ChangePasswordPage';
import { ProfilePage } from '@/features/profile/ProfilePage';
import { PortfolioPage } from '@/features/portfolio/PortfolioPage';
import { DeskPage } from '@/features/queue-operations/DeskPage';
import { MyQueuesPage } from '@/features/queue-operations/MyQueuesPage';
import { AppointmentsPage } from '@/features/appointments/AppointmentsPage';
import { ControlRoomPage } from '@/features/supervision/ControlRoomPage';
import { ReportsPage } from '@/features/supervision/ReportsPage';
import { NotificationsPage } from '@/features/supervision/NotificationsPage';
import { KioskPage } from '@/features/public-experiences/KioskPage';
import { DisplayPage } from '@/features/public-experiences/DisplayPage';
import { TrackPage } from '@/features/public-experiences/TrackPage';
import { HealthPage } from '@/features/health/HealthPage';
import { LegalPage } from '@/features/legal/LegalPage';
import { OnboardingPage } from '@/features/onboarding/OnboardingPage';
import { SettingsPage } from '@/features/onboarding/SettingsPage';

function Page({ title }: { title: string }) {
  const { t } = useTranslation();
  const brandName = useBrandStore((state) => state.name);
  const logoUrl = useBrandStore((state) => state.logoUrl);
  return (
    <div className="bootstrap-page">
      <section className="bootstrap-card" aria-labelledby="page-title">
        {logoUrl ? (
          <img className="brand-logo" src={logoUrl} alt="" />
        ) : (
          <span className="brand-mark" aria-hidden="true">
            D
          </span>
        )}
        <div>
          <p className="eyebrow">{brandName || t('app.name')}</p>
          <h1 id="page-title">{title}</h1>
        </div>
      </section>
    </div>
  );
}

function ProtectedPlaceholder({ name }: { name: string }) {
  const { t } = useTranslation();
  return <Page title={t('routes.placeholder', { name })} />;
}

function TranslatedPage({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation();
  return <Page title={t(titleKey)} />;
}

function LandingRedirect() {
  const user = useSessionStore((state) => state.user);
  return <Navigate replace to={user ? findFirstAuthorizedPath(user) : '/login'} />;
}

function ExperienceRoute({ mode }: { mode: 'kiosk' | 'display' | 'tracking' }) {
  const status = useSessionStore((state) => state.status);
  const user = useSessionStore((state) => state.user);
  const isHumanPreview = status === 'authenticated' && user?.userType === 'human';
  const content =
    mode === 'kiosk' ? (
      <KioskPage />
    ) : mode === 'display' ? (
      <DisplayPage />
    ) : (
      <TrackPage preview={isHumanPreview} />
    );

  if (isHumanPreview) {
    return (
      <AppShell>
        <ExperiencePreview mode={mode}>{content}</ExperiencePreview>
      </AppShell>
    );
  }

  return <PublicExperienceLayout mode={mode}>{content}</PublicExperienceLayout>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingRedirect />} />
      <Route
        path="/login"
        element={
          <PublicExperienceLayout mode="public">
            <LoginPage />
          </PublicExperienceLayout>
        }
      />
      <Route
        path="/legal"
        element={
          <PublicExperienceLayout mode="public">
            <LegalPage />
          </PublicExperienceLayout>
        }
      />
      <Route path="/track" element={<ExperienceRoute mode="tracking" />} />
      <Route element={<ProtectedRoute />}>
        <Route
          path="/change-password"
          element={
            <AppShell>
              <ChangePasswordPage />
            </AppShell>
          }
        />
        <Route
          path="/profile"
          element={
            <AppShell>
              <ProfilePage />
            </AppShell>
          }
        />
      </Route>
      {protectedRoutes.map((route) => (
        <Route
          key={route.path}
          element={
            <ProtectedRoute
              permissions={route.permissions}
              userTypes={
                route.allUserTypes ? undefined : route.technicalUser ? ['kiosk'] : ['human']
              }
            />
          }
        >
          <Route
            path={route.path}
            element={
              route.path === '/desk' ? (
                <AppShell>
                  <DeskPage />
                </AppShell>
              ) : route.path === '/my-queues' ? (
                <AppShell>
                  <MyQueuesPage />
                </AppShell>
              ) : route.path === '/appointments' ? (
                <AppShell>
                  <AppointmentsPage />
                </AppShell>
              ) : route.path === '/portfolio' ? (
                <AppShell>
                  <PortfolioPage />
                </AppShell>
              ) : route.path === '/control-room' ? (
                <AppShell>
                  <ControlRoomPage />
                </AppShell>
              ) : route.path === '/reports' ? (
                <AppShell>
                  <ReportsPage />
                </AppShell>
              ) : route.path === '/notifications' ? (
                <AppShell>
                  <NotificationsPage />
                </AppShell>
              ) : route.path === '/health' ? (
                <AppShell>
                  <HealthPage />
                </AppShell>
              ) : route.path === '/onboarding' ? (
                <AppShell>
                  <OnboardingPage />
                </AppShell>
              ) : route.path.startsWith('/settings') ? (
                <AppShell>
                  <SettingsPage />
                </AppShell>
              ) : route.path === '/kiosk' || route.path === '/display' ? (
                <ExperienceRoute mode={route.path === '/kiosk' ? 'kiosk' : 'display'} />
              ) : (
                <AppShell>
                  <ProtectedPlaceholder name={route.path.slice(1)} />
                </AppShell>
              )
            }
          />
        </Route>
      ))}
      <Route
        path="/forbidden"
        element={
          <PublicExperienceLayout mode="public">
            <TranslatedPage titleKey="errors.forbidden" />
          </PublicExperienceLayout>
        }
      />
      <Route
        path="*"
        element={
          <PublicExperienceLayout mode="public">
            <TranslatedPage titleKey="errors.notFound" />
          </PublicExperienceLayout>
        }
      />
    </Routes>
  );
}

export function App() {
  return (
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  );
}
