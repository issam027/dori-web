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

const showcaseSlides = [
  {
    icon: ListChecks,
    eyebrowKey: 'login.showcase.queues.eyebrow',
    titleKey: 'login.showcase.queues.title',
    descriptionKey: 'login.showcase.queues.description',
    metricKey: 'login.showcase.queues.metric',
  },
  {
    icon: CalendarDays,
    eyebrowKey: 'login.showcase.appointments.eyebrow',
    titleKey: 'login.showcase.appointments.title',
    descriptionKey: 'login.showcase.appointments.description',
    metricKey: 'login.showcase.appointments.metric',
  },
  {
    icon: ChartNoAxesCombined,
    eyebrowKey: 'login.showcase.supervision.eyebrow',
    titleKey: 'login.showcase.supervision.title',
    descriptionKey: 'login.showcase.supervision.description',
    metricKey: 'login.showcase.supervision.metric',
  },
  {
    icon: BellRing,
    eyebrowKey: 'login.showcase.tracking.eyebrow',
    titleKey: 'login.showcase.tracking.title',
    descriptionKey: 'login.showcase.tracking.description',
    metricKey: 'login.showcase.tracking.metric',
  },
  {
    icon: Settings2,
    eyebrowKey: 'login.showcase.management.eyebrow',
    titleKey: 'login.showcase.management.title',
    descriptionKey: 'login.showcase.management.description',
    metricKey: 'login.showcase.management.metric',
  },
] as const satisfies readonly {
  icon: LucideIcon;
  eyebrowKey: string;
  titleKey: string;
  descriptionKey: string;
  metricKey: string;
}[];

function LoginShowcase() {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % showcaseSlides.length);
    }, 5500);
    return () => {
      window.clearInterval(timer);
    };
  }, [paused]);

  const slide = showcaseSlides[index] ?? showcaseSlides[0];
  const Icon = slide.icon;
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
      <button
        className="login-showcase-pause"
        type="button"
        aria-label={t(paused ? 'login.showcase.play' : 'login.showcase.pause')}
        title={t(paused ? 'login.showcase.play' : 'login.showcase.pause')}
        onClick={() => {
          setPaused((current) => !current);
        }}
      >
        {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
      </button>
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
        key={slide.titleKey}
        aria-live={paused ? 'polite' : 'off'}
        aria-atomic="true"
      >
        <span className="login-showcase-icon" aria-hidden="true">
          <Icon />
        </span>
        <p className="eyebrow">{t(slide.eyebrowKey)}</p>
        <h2>{t(slide.titleKey)}</h2>
        <p>{t(slide.descriptionKey)}</p>
        <strong className="login-showcase-metric">{t(slide.metricKey)}</strong>
      </div>
      <div className="login-showcase-dots" role="group" aria-label={t('login.showcase.navigation')}>
        {showcaseSlides.map((item, itemIndex) => (
          <button
            key={item.titleKey}
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
      setApiError(
        __t('ui.expression.auth.login_page.identifiant_ou_mot_de_passe_incorrect_qunbv0'),
      );
    } finally {
      setQuickProfile(null);
    }
  };
  const submit = handleSubmit(authenticate);

  return (
    <section className="auth-card" aria-labelledby="login-title">
      <div className="login-brand">
        <span className="brand-mark">{__t('ui.auth.login_page.d_1hkaexf')}</span>
        <span>
          <strong>{__t('ui.auth.login_page.dori_9y7skh')}</strong>
          <small>{__t('ui.auth.login_page.plateforme_de_gestion_des_flux_cy6z8f')}</small>
        </span>
      </div>
      <div className="login-grid">
        <div className="login-form-panel">
          <p className="eyebrow">{__t('ui.auth.login_page.connexion_securisee_8ak5sk')}</p>
          <h1 id="login-title">{__t('ui.auth.login_page.bienvenue_sur_votre_espace_z9natn')}</h1>
          <p>{__t('ui.auth.login_page.connectez_vous_avec_votre_identifiant_dori_xe5h0m')}</p>
          <form
            className="form-stack"
            onSubmit={(event) => {
              void submit(event);
            }}
          >
            <FormField
              label={__t('ui.auth.login_page.email_ou_nom_utilisateur_18xczuw')}
              required
              error={errors.username?.message}
            >
              <input autoComplete="username" {...register('username')} />
            </FormField>
            <FormField
              label={__t('ui.auth.login_page.mot_de_passe_15gpn9e')}
              required
              error={errors.password?.message}
            >
              <input type="password" autoComplete="current-password" {...register('password')} />
            </FormField>
            <label className="check-row">
              <input type="checkbox" {...register('rememberUsername')} />{' '}
              {__t('ui.auth.login_page.memoriser_mon_identifiant_4tfz4b')}
            </label>
            <button type="button" className="text-button" disabled>
              {__t('ui.auth.login_page.mot_de_passe_oublie_sc5mxu')}
            </button>
            {apiError ? (
              <p className="field-error" role="alert">
                {apiError}
              </p>
            ) : null}
            <button className="button button-primary" disabled={isSubmitting} type="submit">
              <LogIn aria-hidden="true" />
              {isSubmitting
                ? __t('ui.expression.auth.login_page.connexion_6397u6')
                : __t('ui.expression.auth.login_page.se_connecter_1u4l9ls')}
            </button>
          </form>
        </div>
        {import.meta.env.DEV ? (
          <aside className="quick-login" aria-labelledby="quick-login-title">
            <div>
              <p className="eyebrow">{__t('ui.auth.login_page.mode_demonstration_17pdpyl')}</p>
              <h2 id="quick-login-title">{__t('ui.auth.login_page.connexion_rapide_1wyr4bt')}</h2>
              <p>
                {__t('ui.auth.login_page.chaque_profil_utilise_le_parcours_normal_de_l_ap_17kz34e')}
              </p>
            </div>
            <div className="quick-login-grid">
              {demoProfiles.map(({ username, labelKey, detailKey, icon: ProfileIcon }) => (
                <button
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
                  {quickProfile === username ? (
                    <small>{__t('ui.auth.login_page.connexion_1a0ztte')}</small>
                  ) : null}
                </button>
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
