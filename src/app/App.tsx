import { lazy, Suspense, type ComponentType } from 'react';
import { DorifyLoader } from '@/design-system/components/DorifyLoader';
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

const lazyNamed = <P extends object, K extends string>(
  loader: () => Promise<Record<K, ComponentType<P>>>,
  name: K,
) => lazy(async () => ({ default: (await loader())[name] }));

const LoginPage = lazyNamed(() => import('@/features/auth/LoginPage'), 'LoginPage');
const ChangePasswordPage = lazyNamed(
  () => import('@/features/auth/ChangePasswordPage'),
  'ChangePasswordPage',
);
const ProfilePage = lazyNamed(() => import('@/features/profile/ProfilePage'), 'ProfilePage');
const PortfolioPage = lazyNamed(
  () => import('@/features/portfolio/PortfolioPage'),
  'PortfolioPage',
);
const DeskPage = lazyNamed(() => import('@/features/queue-operations/DeskPage'), 'DeskPage');
const MyQueuesPage = lazyNamed(
  () => import('@/features/queue-operations/MyQueuesPage'),
  'MyQueuesPage',
);
const AppointmentsPage = lazyNamed(
  () => import('@/features/appointments/AppointmentsPage'),
  'AppointmentsPage',
);
const ControlRoomPage = lazyNamed(
  () => import('@/features/supervision/ControlRoomPage'),
  'ControlRoomPage',
);
const ReportsPage = lazyNamed(() => import('@/features/supervision/ReportsPage'), 'ReportsPage');
const NotificationsPage = lazyNamed(
  () => import('@/features/supervision/NotificationsPage'),
  'NotificationsPage',
);
const KioskPage = lazyNamed(() => import('@/features/public-experiences/KioskPage'), 'KioskPage');
const DisplayPage = lazyNamed(
  () => import('@/features/public-experiences/DisplayPage'),
  'DisplayPage',
);
const DeviceModePage = lazyNamed(
  () => import('@/features/public-experiences/DeviceModePage'),
  'DeviceModePage',
);
const TrackPage = lazyNamed(() => import('@/features/public-experiences/TrackPage'), 'TrackPage');
const HealthPage = lazyNamed(() => import('@/features/health/HealthPage'), 'HealthPage');
const LegalPage = lazyNamed(() => import('@/features/legal/LegalPage'), 'LegalPage');
const OnboardingPage = lazyNamed(
  () => import('@/features/onboarding/OnboardingPage'),
  'OnboardingPage',
);
const SettingsPage = lazyNamed(() => import('@/features/onboarding/SettingsPage'), 'SettingsPage');

function Page({ title }: { title: string }) {
  const { t: __t } = useTranslation();
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
            {__t('ui.shell.app.d_1hkaexf')}
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

function LegalRoute() {
  const status = useSessionStore((state) => state.status);
  const user = useSessionStore((state) => state.user);
  if (status === 'authenticated' && user?.userType === 'human') {
    return (
      <AppShell>
        <LegalPage />
      </AppShell>
    );
  }
  return (
    <PublicExperienceLayout mode="public">
      <LegalPage />
    </PublicExperienceLayout>
  );
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
      <Route path="/legal" element={<LegalRoute />} />
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
              ) : route.path === '/device-mode' ? (
                <PublicExperienceLayout mode="public">
                  <DeviceModePage />
                </PublicExperienceLayout>
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
      <Suspense fallback={<DorifyLoader />}>
        <AppRoutes />
      </Suspense>
    </AppProviders>
  );
}
