import { lazy, Suspense, type ComponentType } from 'react';
import { DorifyLoader } from '@/design-system/components/DorifyLoader';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSessionStore } from '@/core/auth/session-store';
import { ProtectedRoute } from '@/core/permissions/ProtectedRoute';
import {
  findFirstAuthorizedPath,
  protectedRoutes,
  type ProtectedRouteDefinition,
} from './protected-routes';
import { useBrandStore } from '@/core/theme/brand-store';
import { AppProviders } from './AppProviders';
import { AppShell } from './layouts/AppShell';
import { ExperiencePreview } from './layouts/ExperiencePreview';
import { PublicExperienceLayout } from './layouts/PublicExperienceLayout';
import { isCloudDeployment } from '@/core/config/deployment-mode';

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
const TrackPage = lazyNamed(() => import('@/features/public-experiences/TrackPage'), 'TrackPage');
const LegalPage = lazyNamed(() => import('@/features/legal/LegalPage'), 'LegalPage');

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
            {t('common.d')}
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

function TranslatedPage({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation();
  return <Page title={t(titleKey)} />;
}

function LandingRedirect() {
  const user = useSessionStore((state) => state.user);
  return <Navigate replace to={user ? findFirstAuthorizedPath(user) : '/login'} />;
}

function ExperienceRoute({
  mode,
  Component,
}: {
  mode: 'kiosk' | 'display' | 'tracking';
  Component?: ComponentType;
}) {
  const status = useSessionStore((state) => state.status);
  const user = useSessionStore((state) => state.user);
  const isHumanPreview = status === 'authenticated' && user?.userType === 'human';
  const content = Component ? <Component /> : <TrackPage preview={isHumanPreview} />;

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

function ConfiguredProtectedPage({ view }: { view: ProtectedRouteDefinition }) {
  const Component = view.component;
  if (view.frame === 'experience' && view.experienceMode)
    return <ExperienceRoute mode={view.experienceMode} Component={Component} />;
  if (view.frame === 'public')
    return (
      <PublicExperienceLayout mode={view.publicMode ?? 'public'}>
        <Component />
      </PublicExperienceLayout>
    );
  return (
    <AppShell>
      <Component />
    </AppShell>
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
      {protectedRoutes
        .filter((route) => !route.cloudOnly || isCloudDeployment)
        .map((route) => (
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
            <Route path={route.path} element={<ConfiguredProtectedPage view={route} />} />
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
