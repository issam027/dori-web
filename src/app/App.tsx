import { Navigate, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSessionStore } from '@/core/auth/session-store';
import { ProtectedRoute } from '@/core/permissions/ProtectedRoute';
import { findFirstAuthorizedPath, protectedRoutes } from '@/core/permissions/route-access';
import { useBrandStore } from '@/core/theme/brand-store';
import { AppProviders } from './AppProviders';
import { AppShell } from './layouts/AppShell';
import { PublicExperienceLayout } from './layouts/PublicExperienceLayout';
import { LoginPage } from '@/features/auth/LoginPage';
import { ChangePasswordPage } from '@/features/auth/ChangePasswordPage';
import { ProfilePage } from '@/features/profile/ProfilePage';
import { PortfolioPage } from '@/features/portfolio/PortfolioPage';
import { DeskPage } from '@/features/queue-operations/DeskPage';
import { MyQueuesPage } from '@/features/queue-operations/MyQueuesPage';

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
            <ProtectedPlaceholder name="legal" />
          </PublicExperienceLayout>
        }
      />
      <Route
        path="/track"
        element={
          <PublicExperienceLayout mode="tracking">
            <ProtectedPlaceholder name="tracking" />
          </PublicExperienceLayout>
        }
      />
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
              userTypes={route.technicalUser ? ['kiosk'] : undefined}
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
              ) : route.path === '/portfolio' ? (
                <AppShell>
                  <PortfolioPage />
                </AppShell>
              ) : route.path === '/kiosk' || route.path === '/display' ? (
                <PublicExperienceLayout mode={route.path === '/kiosk' ? 'kiosk' : 'display'}>
                  <ProtectedPlaceholder name={route.path.slice(1)} />
                </PublicExperienceLayout>
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
