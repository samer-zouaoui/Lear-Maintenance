'use client';

import { useEffect, useState } from 'react';
import { apiFetch, getCurrentUser } from '../../../lib/api';
import { useToast } from '../../../components/ToastProvider';

export default function RapportIAPage() {
  const notify = useToast();
  const [currentUser, setCurrentUser] = useState(null);
  const [rapport, setRapport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateGeneration, setDateGeneration] = useState(null);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  const canView = currentUser?.role === 'ADMIN' || currentUser?.role === 'RESPONSABLE_MAINTENANCE';

  if (currentUser && !canView) {
    return (
      <div className="panel">
        <div className="panel-title">Accès restreint</div>
        <p style={{ color: '#767981', fontSize: 14 }}>
          Cette page est réservée à l&apos;administration et à la maintenance.
        </p>
      </div>
    );
  }

  async function genererRapport() {
    setLoading(true);
    try {
      const resultat = await apiFetch('/dashboard/rapport-hebdo');
      setRapport(resultat);
      setDateGeneration(new Date());
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="panel">
        <div className="panel-title">Rapport hebdomadaire (généré par IA)</div>
        <p style={{ fontSize: 13, color: '#767981', marginTop: -6, marginBottom: 16 }}>
          Synthèse en langage naturel des 7 derniers jours d&apos;activité de maintenance, générée à partir de tes indicateurs (MTTR, MTBF, disponibilité).
        </p>
        <button className="btn btn-primary" disabled={loading} onClick={genererRapport}>
          {loading ? 'Génération en cours...' : rapport ? 'Régénérer le rapport' : 'Générer le rapport de la semaine'}
        </button>
      </div>

      {rapport && (
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
            <div className="panel-title" style={{ margin: 0 }}>Résumé</div>
            {dateGeneration && (
              <span style={{ fontSize: 12, color: '#767981' }}>
                Généré le {dateGeneration.toLocaleString('fr-FR')}
              </span>
            )}
          </div>

          <div style={{ lineHeight: 1.7, fontSize: 14.5, marginBottom: 24, whiteSpace: 'pre-line' }}>
            {rapport.rapport}
          </div>

          <div className="panel-title" style={{ fontSize: 15 }}>Indicateurs bruts</div>
          <div className="form-grid">
            <div>
              <strong>MTTR</strong>
              <p style={{ margin: '4px 0 0', color: '#767981' }}>{rapport.chiffres.mttr} h</p>
            </div>
            <div>
              <strong>MTBF</strong>
              <p style={{ margin: '4px 0 0', color: '#767981' }}>{rapport.chiffres.mtbf} h</p>
            </div>
            <div>
              <strong>Disponibilité</strong>
              <p style={{ margin: '4px 0 0', color: '#767981' }}>{rapport.chiffres.disponibilite}%</p>
            </div>
            <div>
              <strong>Machines à l&apos;arrêt</strong>
              <p style={{ margin: '4px 0 0', color: '#767981' }}>{rapport.chiffres.machinesEnArret}</p>
            </div>
            <div>
              <strong>Downtime cumulé</strong>
              <p style={{ margin: '4px 0 0', color: '#767981' }}>{rapport.chiffres.downtimeTotal} h</p>
            </div>
          </div>

          {rapport.chiffres.topMachines.length > 0 && (
            <>
              <div className="panel-title" style={{ fontSize: 15, marginTop: 20 }}>Machines les plus touchées</div>
              <table>
                <thead>
                  <tr><th>Machine</th><th>Nombre de pannes</th></tr>
                </thead>
                <tbody>
                  {rapport.chiffres.topMachines.map((m) => (
                    <tr key={m.codeMachine}>
                      <td>{m.codeMachine} — {m.nomMachine}</td>
                      <td>{m.nombrePannes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {rapport.chiffres.topCauses.length > 0 && (
            <>
              <div className="panel-title" style={{ fontSize: 15, marginTop: 20 }}>Causes les plus fréquentes</div>
              <table>
                <thead>
                  <tr><th>Catégorie</th><th>Nombre de pannes</th></tr>
                </thead>
                <tbody>
                  {rapport.chiffres.topCauses.map((c) => (
                    <tr key={c.categorie}>
                      <td>{c.categorie}</td>
                      <td>{c.nombrePannes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </>
  );
}