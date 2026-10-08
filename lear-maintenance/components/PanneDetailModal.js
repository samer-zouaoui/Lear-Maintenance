'use client';

import { useState } from 'react';
import { API_URL } from '../lib/api';

export default function PanneDetailModal({
  panne,
  loading,
  onClose,
  showTechnicienAffecte = true,
  // --- Props optionnelles pour les actions contextuelles (rôle ADMIN / RESPONSABLE_MAINTENANCE / TECHNICIEN) ---
  currentUser = null,
  techniciens = [],
  onAssign = null, // async (panneId, technicienId) => void
  onPrendreEnCharge = null, // async (panneId) => void
  onCloturerClick = null, // (panne) => void — ouvre la modale de clôture
}) {
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [prendreEnChargeSubmitting, setPrendreEnChargeSubmitting] = useState(false);

  if (!loading && !panne) return null;

  const role = currentUser?.role;
  const isManager = role === 'ADMIN' || role === 'RESPONSABLE_MAINTENANCE';
  const isTechnicien = role === 'TECHNICIEN';
  const isResolue = panne?.statutPanne === 'RESOLU';

  async function handleAssignChange(e) {
    const technicienId = e.target.value;
    if (!technicienId || !onAssign) return;
    setAssignSubmitting(true);
    try {
      await onAssign(panne.idPanne, parseInt(technicienId));
    } finally {
      setAssignSubmitting(false);
    }
  }

  async function handlePrendreEnCharge() {
    if (!onPrendreEnCharge) return;
    setPrendreEnChargeSubmitting(true);
    try {
      await onPrendreEnCharge(panne.idPanne);
    } finally {
      setPrendreEnChargeSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box"
        style={{ width: 'min(760px, 100%)', maxHeight: '85vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <>
            <div className="skeleton-line" style={{ width: '40%', height: 20, marginBottom: 18 }} />
            <div className="skeleton-line" style={{ marginBottom: 10 }} />
            <div className="skeleton-line" style={{ width: '70%' }} />
          </>
        ) : (
          <>
            <div className="modal-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Détails de la panne #{panne.idPanne}
              <button className="btn btn-ghost" onClick={onClose}>Fermer</button>
            </div>

            <div className="form-grid" style={{ marginBottom: 16 }}>
              <div>
                <strong>Titre</strong>
                <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>{panne.titre}</p>
              </div>
              <div>
                <strong>Machine</strong>
                <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>{panne.machine?.codeMachine || `#${panne.machineId}`}</p>
              </div>
              <div>
                <strong>Statut</strong>
                <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>{panne.statutPanne}</p>
              </div>
              <div>
                <strong>Priorité</strong>
                <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>{panne.priorite}</p>
              </div>
              <div>
                <strong>Catégorie</strong>
                <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>{panne.categorie}</p>
              </div>
              {showTechnicienAffecte && (
                <div>
                  <strong>Technicien affecté</strong>
                  <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>{panne.technicien?.nomUser || 'Non affecté'}</p>
                </div>
              )}
              {showTechnicienAffecte && panne.technicien && panne.dateAffectation && (
                <div>
                  <strong>Affecté le</strong>
                  <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>
                    {new Date(panne.dateAffectation).toLocaleString('fr-FR')}
                  </p>
                </div>
              )}
            </div>

            {panne.photoUrl && (
              <div style={{ marginBottom: 20 }}>
                <strong style={{ display: 'block', marginBottom: 8 }}>Photo</strong>
                <img
                  src={`${API_URL}${panne.photoUrl}`}
                  alt={`Photo de la panne #${panne.idPanne}`}
                  style={{ maxWidth: '100%', maxHeight: 320, borderRadius: 6, border: '1px solid var(--border)' }}
                />
              </div>
            )}

            {!isResolue && (isManager || isTechnicien) && (
              <div
                style={{
                  marginBottom: 20,
                  padding: 14,
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--panel-alt, rgba(127,127,127,0.06))',
                }}
              >
                <strong style={{ display: 'block', marginBottom: 10 }}>Actions</strong>

                {isManager && onAssign && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <label style={{ margin: 0, fontSize: 13 }}>Affecter à un technicien :</label>
                    <select
                      defaultValue=""
                      onChange={handleAssignChange}
                      disabled={assignSubmitting}
                      style={{ fontSize: 12.5, padding: '6px 8px' }}
                    >
                      <option value="">
                        {panne.technicienId ? 'Réaffecter à...' : 'Affecter à...'}
                      </option>
                      {techniciens.map((t) => (
                        <option key={t.idUser} value={t.idUser}>{t.nomUser}</option>
                      ))}
                    </select>
                    {assignSubmitting && <span style={{ fontSize: 12, color: 'var(--muted)' }}>Affectation...</span>}
                  </div>
                )}

                {isTechnicien && panne.statutPanne === 'AFFECTE' && onPrendreEnCharge && (
                  <button className="btn btn-primary" disabled={prendreEnChargeSubmitting} onClick={handlePrendreEnCharge}>
                    {prendreEnChargeSubmitting ? 'Traitement...' : 'Prendre en charge'}
                  </button>
                )}

                {isTechnicien && panne.statutPanne === 'EN_COURS' && onCloturerClick && (
                  <button className="btn btn-primary" onClick={() => onCloturerClick(panne)}>
                    Clôturer
                  </button>
                )}
              </div>
            )}

            <div className="panel-title" style={{ fontSize: 16, marginTop: 0 }}>Interventions liées</div>
            {!panne.interventions || panne.interventions.length === 0 ? (
              <p style={{ color: 'var(--muted)' }}>Aucune intervention enregistrée pour cette panne.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Diagnostic</th>
                    <th>Cause racine</th>
                    <th>Solution</th>
                    <th>Technicien</th>
                    <th>Début</th>
                    <th>Fin</th>
                  </tr>
                </thead>
                <tbody>
                  {panne.interventions.map((intervention) => (
                    <tr key={intervention.idIntervention}>
                      <td>{intervention.diagnostic}</td>
                      <td>{intervention.causeRacine}</td>
                      <td>{intervention.solutionAppliquee}</td>
                      <td>{intervention.technicien?.nomUser || `#${intervention.technicienId}`}</td>
                      <td>{new Date(intervention.dateDebut).toLocaleString('fr-FR')}</td>
                      <td>{intervention.dateFin ? new Date(intervention.dateFin).toLocaleString('fr-FR') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
}