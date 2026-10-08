import type { CallNextRegistrationResponseDto } from '@/api/generated/models';

export function Receipt80mm({
  call,
  outcome,
}: {
  call: CallNextRegistrationResponseDto;
  outcome: 'served' | 'no_show';
}) {
  return (
    <article className="receipt-80mm">
      <h2>DORI</h2>
      <p>Récapitulatif de passage</p>
      <strong>{call.ticketNumber}</strong>
      <dl>
        <div>
          <dt>Guichet</dt>
          <dd>{call.threadNumber}</dd>
        </div>
        <div>
          <dt>Heure d'appel</dt>
          <dd>{new Date(call.calledAt).toLocaleTimeString()}</dd>
        </div>
        <div>
          <dt>Résultat</dt>
          <dd>{outcome === 'served' ? 'Servi' : 'Absent'}</dd>
        </div>
      </dl>
      <small>Document non fiscal — données confirmées par le service.</small>
      <button
        className="button print-hidden"
        type="button"
        onClick={() => {
          window.print();
        }}
      >
        Imprimer
      </button>
    </article>
  );
}
