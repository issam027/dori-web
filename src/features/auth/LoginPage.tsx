import { useTranslation } from 'react-i18next';
import {
  BellRing,
  BriefcaseBusiness,
  CalendarDays,
  ChartNoAxesCombined,
  Headset,
  ListChecks,
  LogIn,
  MonitorSmartphone,
  Pause,
  Play,
  Settings2,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import type { TFunction } from 'i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { getRememberedUsername, login } from '@/core/auth/session-actions';
import { useSessionStore } from '@/core/auth/session-store';
import { findFirstAuthorizedPath } from '@/core/permissions/route-access';
import { FormField } from '@/design-system/components/FormField';
import {
  loginShowcaseKey,
  loginShowcaseSlides,
  type LoginShowcaseSlide,
} from '@/core/content/login-showcase';
import { Button } from '@/design-system/components/Button';

const createSchema = (t: TFunction) =>
  z.object({
    username: z.string().trim().min(1, t('validation.usernameRequired')),
    password: z.string().min(1, t('validation.passwordRequired')),
    rememberUsername: z.boolean(),
  });
type LoginForm = z.infer<ReturnType<typeof createSchema>>;

const demoProfiles = [
  { username: 'root', labelKey: 'demo.root', icon: ShieldCheck, detailKey: 'demo.rootDetail' },
  { username: 'admin', labelKey: 'demo.admin', icon: Settings2, detailKey: 'demo.adminDetail' },
  {
    username: 'manager',
    labelKey: 'demo.manager',
    icon: BriefcaseBusiness,
    detailKey: 'demo.managerDetail',
  },
  {
    username: 'operator',
    labelKey: 'demo.operator',
    icon: Headset,
    detailKey: 'demo.operatorDetail',
  },
  {
    username: 'kiosk',
    labelKey: 'demo.kiosk',
    icon: MonitorSmartphone,
    detailKey: 'demo.kioskDetail',
  },
] as const;
const demoPassword = 'Root@123456';

const showcaseIcons = {
  queues: ListChecks,
  appointments: CalendarDays,
  supervision: ChartNoAxesCombined,
  tracking: BellRing,
  management: Settings2,
} satisfies Record<LoginShowcaseSlide, LucideIcon>;

function LoginShowcase() {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % loginShowcaseSlides.length);
    }, 5500);
    return () => {
      window.clearInterval(timer);
    };
  }, [paused]);

  const slide = loginShowcaseSlides[index] ?? loginShowcaseSlides[0];
  const Icon = showcaseIcons[slide];
  return (
    <aside
      className="login-showcase"
      aria-label={t('login.showcase.label')}
      onMouseEnter={() => {
        setPaused(true);
      }}
      onMouseLeave={() => {
        setPaused(false);
      }}
    >
      <Button variant="unstyled"
        className="login-showcase-pause"
        type="button"
        aria-label={t(paused ? 'login.showcase.play' : 'login.showcase.pause')}
        title={t(paused ? 'login.showcase.play' : 'login.showcase.pause')}
        onClick={() => {
          setPaused((current) => !current);
        }}
      >
        {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
      </Button>
      <div className="login-showcase-visual" aria-hidden="true">
        <span className="login-showcase-orbit login-showcase-orbit-one" />
        <span className="login-showcase-orbit login-showcase-orbit-two" />
        <div className="login-showcase-preview">
          <span className="login-showcase-preview-icon">
            <Icon />
          </span>
          <span />
          <span />
          <span />
        </div>
      </div>
      <div
        className="login-showcase-slide"
        key={slide}
        aria-live={paused ? 'polite' : 'off'}
        aria-atomic="true"
      >
        <span className="login-showcase-icon" aria-hidden="true">
          <Icon />
        </span>
        <p className="eyebrow">{t(loginShowcaseKey(slide, 'eyebrow'))}</p>
        <h2>{t(loginShowcaseKey(slide, 'title'))}</h2>
        <p>{t(loginShowcaseKey(slide, 'description'))}</p>
        <strong className="login-showcase-metric">{t(loginShowcaseKey(slide, 'metric'))}</strong>
      </div>
      <div className="login-showcase-dots" role="group" aria-label={t('login.showcase.navigation')}>
        {loginShowcaseSlides.map((item, itemIndex) => (
          <Button variant="unstyled"
            key={item}
            type="button"
            aria-label={t('login.showcase.goto', { number: itemIndex + 1 })}
            aria-pressed={itemIndex === index}
            onClick={() => {
              setIndex(itemIndex);
              setPaused(true);
            }}
          />
        ))}
      </div>
    </aside>
  );
}

export function LoginPage() {
  const { t: __t } = useTranslation();
  const user = useSessionStore((state) => state.user);
  const navigate = useNavigate();
  const location = useLocation();
  const [apiError, setApiError] = useState('');
  const [quickProfile, setQuickProfile] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(createSchema(__t)),
    defaultValues: {
      username: getRememberedUsername(),
      password: '',
      rememberUsername: Boolean(getRememberedUsername()),
    },
  });

  if (user)
    return (
      <Navigate
        replace
        to={user.mustChangePassword ? '/change-password' : findFirstAuthorizedPath(user)}
      />
    );

  const authenticate = async (values: LoginForm) => {
    setApiError('');
    try {
      await login(
        { username: values.username, password: values.password },
        values.rememberUsername,
      );
      const current = useSessionStore.getState().user;
      const requested = (location.state as { from?: string } | null)?.from;
      if (current)
        void navigate(
          current.mustChangePassword
            ? '/change-password'
            : current.userType === 'kiosk'
              ? '/device-mode'
              : (requested ?? findFirstAuthorizedPath(current)),
          { replace: true },
        );
    } catch {
      setApiError(__t('auth.login.identifiantOuMotDePasseIncorrect'));
    } finally {
      setQuickProfile(null);
    }
  };
  const submit = handleSubmit(authenticate);

  return (
    <section className="auth-card" aria-labelledby="login-title">
      <div className="login-brand">
        <span className="brand-mark">{__t('common.d')}</span>
        <span>
          <strong>{__t('app.name')}</strong>
          <small>{__t('auth.login.plateformeDeGestionDesFlux')}</small>
        </span>
      </div>
      <div className="login-grid">
        <div className="login-form-panel">
          <p className="eyebrow">{__t('auth.login.connexionSecurisee')}</p>
          <h1 id="login-title">{__t('auth.login.bienvenueSurVotreEspace')}</h1>
          <p>{__t('auth.login.connectezVousAvecVotreIdentifiantDori')}</p>
          <form
            className="form-stack"
            onSubmit={(event) => {
              void submit(event);
            }}
          >
            <FormField
              label={__t('auth.login.emailOuNomUtilisateur')}
              required
              error={errors.username?.message}
            >
              <input autoComplete="username" {...register('username')} />
            </FormField>
            <FormField
              label={__t('auth.login.motDePasse')}
              required
              error={errors.password?.message}
            >
              <input type="password" autoComplete="current-password" {...register('password')} />
            </FormField>
            <label className="check-row">
              <input type="checkbox" {...register('rememberUsername')} />{' '}
              {__t('auth.login.memoriserMonIdentifiant')}
            </label>
            <Button variant="unstyled" type="button" className="text-button" disabled>
              {__t('auth.login.motDePasseOublie')}
            </Button>
            {apiError ? (
              <p className="field-error" role="alert">
                {apiError}
              </p>
            ) : null}
            <Button variant="unstyled" className="button button-primary" disabled={isSubmitting} type="submit">
              <LogIn aria-hidden="true" />
              {isSubmitting ? __t('auth.login.signingIn') : __t('auth.login.seConnecter')}
            </Button>
          </form>
        </div>
        {import.meta.env.DEV ? (
          <aside className="quick-login" aria-labelledby="quick-login-title">
            <div>
              <p className="eyebrow">{__t('auth.login.modeDemonstration')}</p>
              <h2 id="quick-login-title">{__t('auth.login.connexionRapide')}</h2>
              <p>{__t('auth.login.chaqueProfilUtiliseLeParcoursNormalDeLAp')}</p>
            </div>
            <div className="quick-login-grid">
              {demoProfiles.map(({ username, labelKey, detailKey, icon: ProfileIcon }) => (
                <Button variant="unstyled"
                  key={username}
                  className="button quick-login-button"
                  type="button"
                  disabled={isSubmitting || quickProfile !== null}
                  onClick={() => {
                    setQuickProfile(username);
                    void authenticate({
                      username,
                      password: demoPassword,
                      rememberUsername: false,
                    });
                  }}
                >
                  <span className="quick-login-icon" aria-hidden="true">
                    <ProfileIcon />
                  </span>
                  <strong>{__t(labelKey)}</strong>
                  <span>{__t(detailKey)}</span>
                  <small>@{username}</small>
                  {quickProfile === username ? <small>{__t('auth.login.connexion')}</small> : null}
                </Button>
              ))}
            </div>
          </aside>
        ) : (
          <LoginShowcase />
        )}
      </div>
    </section>
  );
}
