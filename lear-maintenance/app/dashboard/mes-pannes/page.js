'use client';

import { useEffect, useState } from 'react';
import { apiFetch, getCurrentUser } from '../../../lib/api';
import { useToast } from '../../../components/ToastProvider';
import { SkeletonTable } from '../../../components/Skeleton';
import PanneDetailModal from '../../../components/PanneDetailModal';
import CloturerPanneModal from '../../../components/CloturerPanneModal';

const STATUT_BADGE = {
  NOUVEAU: 'badge-neutral',
  AFFECTE: 'badge-info',
  EN_COURS: 'badge-warning',
  RESOLU: 'badge-success',
};

const ACTION_LABELS = {
  AFFECTE: 'Prendre en charge',
  EN_COURS: 'Clôturer',
};

function StatutBadge({ statut }) {
  if (statut === 'EN_COURS') {
    return (
      <span className={`badge ${STATUT_BADGE[statut]} badge-live`}>
        <span className="pulse-dot" />
        {statut}
      </span>
    );
  }
  return <span className={`badge ${STATUT_BADGE[statut] || 'badge-neutral'}`}>{statut}</span>;
}

export default function MesPannesPage() {
  const notify = useToast();
  const [currentUser, setCurrentUser] = useState(null);
  const [pannes, setPannes] = useState([]);

  const [detailPanne, setDetailPanne] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [closeTarget, setCloseTarget] = useState(null);

  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState(null);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  async function loadPannes() {
    try {
      const data = await apiFetch('/pannes/me');
      setPannes(data);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPannes();
  }, []);

  async function openPanneDetails(panneId) {
    setDetailPanne(null);
    setDetailLoading(true);
    try {
      const details = await apiFetch(`/pannes/${panneId}/details`);
      setDetailPanne(details);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setDetailLoading(false);
    }
  }

  async function updateStatus(panneId, statutPanne) {
    setSubmittingId(panneId);
    try {
      await apiFetch(`/pannes/${panneId}`, {
        method: 'PUT',
        body: JSON.stringify({ statutPanne }),
      });
      notify('Panne prise en charge', 'success');
      await loadPannes();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSubmittingId(null);
    }
  }

  if (currentUser && currentUser.role !== 'TECHNICIEN') {
    return (
      <div className="panel">
        <div className="panel-title">Accès restreint</div>
        <p style={{ color: '#767981', fontSize: 14 }}>
          Cette page est réservée aux techniciens.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="panel">
        <div className="panel-title">Mes pannes assignées</div>
        <p style={{ fontSize: 13, color: '#767981', marginTop: -6, marginBottom: 16 }}>
          Les tickets ci-dessous sont affectés à ton compte connecté.
        </p>

        <table>
          <thead>
            <tr>
              <th>Panne</th>
              <th>Machine</th>
              <th>Catégorie</th>
              <th>Priorité</th>
              <th>Statut</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTable rows={4} columns={7} />
            ) : pannes.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-row">
                  Aucune panne ne t&apos;est assignée pour le moment.
                </td>
              </tr>
            ) : (
              pannes.map((panne) => {
                const canStart = panne.statutPanne === 'AFFECTE';
                const canClose = panne.statutPanne === 'EN_COURS';

                return (
                  <tr key={panne.idPanne}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{panne.titre}</div>
                      <div style={{ fontSize: 12, color: '#767981' }}>#{panne.idPanne}</div>
                    </td>
                    <td>{panne.machine?.codeMachine || `#${panne.machineId}`}</td>
                    <td>{panne.categorie}</td>
                    <td>{panne.priorite}</td>
                    <td><StatutBadge statut={panne.statutPanne} /></td>
                    <td>{new Date(panne.dateCreation).toLocaleString('fr-FR')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button className="btn btn-ghost" onClick={() => openPanneDetails(panne.idPanne)}>
                          Détails
                        </button>
                        {canStart && (
                          <button
                            className="btn btn-primary"
                            disabled={submittingId === panne.idPanne}
                            onClick={() => updateStatus(panne.idPanne, 'EN_COURS')}
                          >
                            {submittingId === panne.idPanne ? 'Traitement...' : ACTION_LABELS.AFFECTE}
                          </button>
                        )}
                        {canClose && (
                          <button
                            className="btn btn-primary"
                            disabled={submittingId === panne.idPanne}
                            onClick={() => setCloseTarget(panne)}
                          >
                            {submittingId === panne.idPanne ? 'Traitement...' : ACTION_LABELS.EN_COURS}
                          </button>
                        )}
                        {!canStart && !canClose && (
                          <span style={{ color: '#767981', fontSize: 12 }}>Aucune action disponible</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <PanneDetailModal
        panne={detailPanne}
        loading={detailLoading}
        onClose={() => setDetailPanne(null)}
        currentUser={currentUser}
        onPrendreEnCharge={async (panneId) => {
          await updateStatus(panneId, 'EN_COURS');
          setDetailPanne(null);
        }}
        onCloturerClick={(panne) => {
          setDetailPanne(null);
          setCloseTarget(panne);
        }}
      />

      {closeTarget && (
        <CloturerPanneModal
          panne={closeTarget}
          onClose={() => setCloseTarget(null)}
          onSuccess={() => {
            setCloseTarget(null);
            loadPannes();
          }}
        />
      )}
    </>
  );
}