'use client';

import { useState } from 'react';
import { apiFetch } from '../lib/api';
import { useToast } from './ToastProvider';

function echeanceInfo(dateProchaine) {
  const diffJours = Math.floor((new Date(dateProchaine) - new Date()) / (1000 * 60 * 60 * 24));
  if (diffJours < 0) return { label: `En retard de ${Math.abs(diffJours)} j`, badge: 'badge-danger' };
  if (diffJours <= 7) return { label: `Dans ${diffJours} j`, badge: 'badge-warning' };
  return { label: `Dans ${diffJours} j`, badge: 'badge-success' };
}

function isSameDay(a, b) {
  const d1 = new Date(a);
  const d2 = new Date(b);
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

export default function PlanPreventifDetailModal({ plan, loading, onClose, currentUser, onRealise }) {
  const notify = useToast();
  const [remarque, setRemarque] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && !plan) return null;

  const isTechnicien = currentUser?.role === 'TECHNICIEN';
  const dejaRealiseeAujourdhui = plan?.dateDerniereRealisation && isSameDay(plan.dateDerniereRealisation, new Date());
  const peutRealiser =
    plan?.statut === 'ACTIF' && !dejaRealiseeAujourdhui && (!isTechnicien || plan.technicienId === currentUser.idUser);

  async function handleRealiser() {
    setSubmitting(true);
    try {
      await apiFetch(`/maintenances-preventives/${plan.idPlan}/realiser`, {
        method: 'POST',
        body: JSON.stringify({ remarque: remarque || null }),
      });
      notify('Maintenance réalisée avec succès', 'success');
      setRemarque('');
      onRealise?.();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box"
        style={{ width: 'min(700px, 100%)', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <p style={{ color: '#767981' }}>Chargement...</p>
        ) : (
          <>
            <div className="modal-title">{plan.titre}</div>
            <p style={{ fontSize: 13, color: '#767981', marginTop: -6, marginBottom: 16 }}>
              Machine {plan.machine?.codeMachine} — {plan.machine?.nomMachine}
            </p>

            <div className="form-grid" style={{ marginBottom: 20 }}>
              <div>
                <strong>Fréquence</strong>
                <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>{plan.frequence} ({plan.intervalleJours} j)</p>
              </div>
              <div>
                <strong>Prochaine échéance</strong>
                <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>
                  {new Date(plan.dateProchaine).toLocaleDateString('fr-FR')}{' '}
                  <span className={`badge ${echeanceInfo(plan.dateProchaine).badge}`}>
                    {echeanceInfo(plan.dateProchaine).label}
                  </span>
                </p>
              </div>
              <div>
                <strong>Dernière réalisation</strong>
                <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>
                  {plan.dateDerniereRealisation ? new Date(plan.dateDerniereRealisation).toLocaleDateString('fr-FR') : 'Jamais'}
                </p>
              </div>
              <div>
                <strong>Technicien assigné</strong>
                <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>{plan.technicien?.nomUser || 'Non assigné'}</p>
              </div>
              {plan.technicien && plan.dateAffectation && (
                <div>
                  <strong>Affecté le</strong>
                  <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>
                    {new Date(plan.dateAffectation).toLocaleString('fr-FR')}
                  </p>
                </div>
              )}
              <div>
                <strong>Statut</strong>
                <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>{plan.statut}</p>
              </div>
              {plan.description && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <strong>Description</strong>
                  <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>{plan.description}</p>
                </div>
              )}
            </div>

            {dejaRealiseeAujourdhui && (!isTechnicien || plan.technicienId === currentUser.idUser) && plan.statut === 'ACTIF' && (
              <div
                style={{
                  marginBottom: 20,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  fontSize: 13,
                  color: 'var(--muted)',
                }}
              >
                ✅ Déjà réalisée aujourd&apos;hui. Prochaine réalisation possible à partir du{' '}
                {new Date(plan.dateProchaine).toLocaleDateString('fr-FR')}.
              </div>
            )}

            {peutRealiser && (
              <div
                style={{
                  marginBottom: 20,
                  padding: 14,
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--panel-alt, rgba(127,127,127,0.06))',
                }}
              >
                <strong style={{ display: 'block', marginBottom: 10 }}>Marquer comme réalisée</strong>
                <input
                  value={remarque}
                  onChange={(e) => setRemarque(e.target.value)}
                  placeholder="Remarque (optionnel)"
                  style={{ width: '100%', marginBottom: 10 }}
                />
                <button className="btn btn-primary" disabled={submitting} onClick={handleRealiser}>
                  {submitting ? 'Enregistrement...' : 'Réaliser cette maintenance'}
                </button>
              </div>
            )}

            <div className="panel-title" style={{ fontSize: 16, marginTop: 0 }}>Historique des réalisations</div>
            {plan.historique?.length === 0 || !plan.historique ? (
              <p className="chart-empty">Aucune réalisation enregistrée pour l&apos;instant.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Technicien</th>
                    <th>Remarque</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.historique.map((h) => (
                    <tr key={h.idHistorique}>
                      <td>{new Date(h.dateRealisation).toLocaleString('fr-FR')}</td>
                      <td>{h.technicien?.nomUser || '—'}</td>
                      <td>{h.remarque || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button className="btn btn-secondary" onClick={onClose}>Fermer</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}