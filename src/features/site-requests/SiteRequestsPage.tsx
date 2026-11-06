import { Button } from '@/design-system/components/Button';
import './site-requests.css';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { httpClient } from '@/api/client/http-client';

interface SiteRequest {
  id: string;
  createdAt: string;
  status: string;
  topic: string;
  organization: string;
  name: string;
  email: string;
  phone?: string;
  hosting: string;
  sites: string;
  queues?: number | null;
  peoplePerDay?: number | null;
  message?: string;
  consent?: boolean;
}
const topics: Record<string, string> = {
  account: 'Création de compte',
  demo: 'Démonstration',
  contact: 'Contact',
};
const hosting: Record<string, string> = { cloud: 'Cloud', intra: 'Intra', undecided: 'À définir' };
const number = (value?: number | null) =>
  value == null ? 'À définir' : value.toLocaleString('fr-FR');
export function SiteRequestsPage() {
  const [search, setSearch] = useState(''),
    [filter, setFilter] = useState(''),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState<string | null>(null);
  const list = useQuery({
    queryKey: ['site-requests', filter, page],
    queryFn: async () =>
      (
        await httpClient.get<{ data: { items: SiteRequest[]; total: number; pageSize: number } }>(
          '/api/v1/site-requests',
          { params: { search: filter, page } },
        )
      ).data.data,
  });
  const detail = useQuery({
    queryKey: ['site-request', selected],
    enabled: Boolean(selected),
    queryFn: async () =>
      (await httpClient.get<{ data: SiteRequest }>('/api/v1/site-requests/' + selected)).data.data,
  });
  return (
    <section className="page-stack site-requests-page">
      <h1>Demandes du site</h1>
      <p>
        Demandes reçues depuis le site public. Consultation réservée à root. Conservation : 90 jours
        par défaut.
      </p>
      <form
        className="site-requests-search"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setSelected(null);
          setFilter(search);
        }}
      >
        <label htmlFor="request-search">Référence, organisation, nom ou email</label>{' '}
        <input
          id="request-search"
          value={search}
          maxLength={160}
          onChange={(event) => setSearch(event.target.value)}
        />{' '}
        <Button type="submit">Rechercher</Button>{' '}
        <Button
          type="button"
          onClick={() => {
            void list.refetch();
          }}
        >
          Actualiser
        </Button>
      </form>
      {list.isPending && <p role="status">Chargement des demandes…</p>}
      {list.isError && (
        <p role="alert">
          Impossible de consulter les demandes. Vérifiez la connexion et réessayez.
        </p>
      )}
      {list.data && (
        <>
          <p>{list.data.total} demande(s)</p>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Organisation</th>
                  <th>Objet</th>
                  <th>Statut</th>
                  <th>Détail</th>
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((item) => (
                  <tr key={item.id}>
                    <td>{new Date(item.createdAt).toLocaleString('fr-FR')}</td>
                    <td>{item.organization}</td>
                    <td>{topics[item.topic] || item.topic}</td>
                    <td>{item.status === 'pending' ? 'Nouvelle' : item.status}</td>
                    <td>
                      <Button
                        type="button"
                        onClick={() => setSelected(item.id)}
                        aria-label={'Consulter ' + item.organization}
                      >
                        Consulter
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!list.data.total && <p>Aucune demande trouvée.</p>}
          <nav aria-label="Pagination des demandes">
            <Button
              type="button"
              disabled={page === 1}
              onClick={() => {
                setSelected(null);
                setPage(page - 1);
              }}
            >
              Précédent
            </Button>{' '}
            Page {page}{' '}
            <Button
              type="button"
              disabled={page * list.data.pageSize >= list.data.total}
              onClick={() => {
                setSelected(null);
                setPage(page + 1);
              }}
            >
              Suivant
            </Button>
          </nav>
        </>
      )}
      {selected && (
        <section className="site-request-detail" aria-label="Détail de la demande">
          <h2>Détail de la demande</h2>
          <Button type="button" onClick={() => setSelected(null)}>
            Fermer le détail
          </Button>
          {detail.isPending && <p role="status">Chargement du détail…</p>}
          {detail.isError && <p role="alert">Le détail est indisponible ou la demande a expiré.</p>}
          {detail.data && (
            <dl>
              {Object.entries({
                Référence: detail.data.id,
                Date: new Date(detail.data.createdAt).toLocaleString('fr-FR'),
                Statut: detail.data.status === 'pending' ? 'Nouvelle' : detail.data.status,
                Objet: topics[detail.data.topic] || detail.data.topic,
                Organisation: detail.data.organization,
                Nom: detail.data.name,
                Email: detail.data.email,
                Téléphone: detail.data.phone || 'Non renseigné',
                Hébergement: hosting[detail.data.hosting] || detail.data.hosting,
                Sites: detail.data.sites === 'undecided' ? 'À définir' : detail.data.sites,
                'Files (total)': number(detail.data.queues),
                'Personnes par jour (total)': number(detail.data.peoplePerDay),
                Message: detail.data.message || 'Non renseigné',
                Consentement: detail.data.consent ? 'Oui' : 'Non renseigné',
              }).map(([key, value]) => (
                <div key={key}>
                  <dt>
                    <strong>{key}</strong>
                  </dt>
                  <dd style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      )}
    </section>
  );
}
