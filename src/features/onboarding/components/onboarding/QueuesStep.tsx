import { useTranslation } from 'react-i18next';
import { type OnboardingDraft } from '../../model/onboarding-draft';
import { Button } from '@/design-system/components/Button';
import { DataTable } from '@/design-system/components/DataTable';
import { Title } from './OnboardingStepTitle';
export function QueuesStep({
  draft,
  open,
  edit,
}: {
  draft: OnboardingDraft;
  open: () => void;
  edit: (queueCode: string) => void;
}) {
  const { t: __t } = useTranslation();
  return (
    <section>
      <Title
        title={__t('onboarding.onboarding.filesGuichets')}
        text={__t('onboarding.queueOverrideHelp')}
        action={
          <Button variant="primary" type="submit" onClick={open}>
            {__t('onboarding.onboarding.ajouterUneFile')}
          </Button>
        }
      />
      <div className="inheritance-note">
        <b>{__t('onboarding.onboarding.principeDHeritage')}</b>
        <p>{__t('onboarding.onboarding.uneValeurAbsenteOuRemiseAHeriterUtiliseL')}</p>
      </div>
      <DataTable
        caption={__t('onboarding.onboarding.filesGuichets')}
        containerClassName="table-wrap admin-table-wrap onboarding-queue-table"
      >
        <thead>
          <tr>
            <th scope="col">{__t('onboarding.onboarding.code')}</th>
            <th scope="col">{__t('common.name')}</th>
            <th scope="col">{__t('common.guichets')}</th>
            <th scope="col">{__t('common.rdv')}</th>
            <th scope="col">{__t('common.devise')}</th>
            <th scope="col">{__t('common.api')}</th>
            <th scope="col" className="table-action-column">
              {__t('onboarding.queueActions')}
            </th>
          </tr>
        </thead>
        <tbody>
          {draft.queues.map((q) => (
            <tr key={q.queueCode}>
              <td>
                <b>{q.queueCode}</b>
              </td>
              <td>{q.queueName || '—'}</td>
              <td>{q.threadCount ?? 1}</td>
              <td>
                {q.appointmentsEnabled === undefined
                  ? __t('onboarding.onboarding.herite')
                  : q.appointmentsEnabled
                    ? __t('common.actives')
                    : __t('common.desactives')}
              </td>
              <td>{q.currency || __t('common.heritee')}</td>
              <td>
                <span
                  className={`status-badge ${draft.confirmedQueueIds[q.queueCode] ? 'status-success' : ''}`}
                >
                  {draft.confirmedQueueIds[q.queueCode]
                    ? __t('onboarding.onboarding.confirmee')
                    : __t('onboarding.onboarding.brouillon')}
                </span>
              </td>
              <td className="table-action-column">
                <Button
                  variant="unstyled"
                  type="button"
                  className="button button-small"
                  aria-label={__t('onboarding.editQueueLabel', {
                    queue: q.queueName || q.queueCode,
                  })}
                  onClick={() => {
                    edit(q.queueCode);
                  }}
                >
                  {__t('onboarding.editQueue')}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </section>
  );
}