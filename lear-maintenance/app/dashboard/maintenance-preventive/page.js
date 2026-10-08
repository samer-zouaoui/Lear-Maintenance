'use client';

import { useEffect, useState } from 'react';
import { apiFetch, getCurrentUser } from '../../../lib/api';
import { useToast } from '../../../components/ToastProvider';
import { SkeletonTable } from '../../../components/Skeleton';
import PlanPreventifModal from '../../../components/PlanPreventifModal';
import PlanPreventifDetailModal from '../../../components/PlanPreventifDetailModal';

function echeanceInfo(dateProchaine) {
  const diffJours = Math.floor((new Date(dateProchaine) - new Date()) / (1000 * 60 * 60 * 24));
  if (diffJours < 0) return { label: `En retard (${Math.abs(diffJours)} j)`, badge: 'badge-danger' };
  if (diffJours <= 7) return { label: `Dans ${diffJours} j`, badge: 'badge-warning' };
  return { label: `Dans ${diffJours} j`, badge: 'badge-success' };
}

export default function MaintenancePreventivePage() {
  const notify = useToast();
  const [currentUser, setCurrentUser] = useState(null);

  const [plans, setPlans] = useState([]);
  const [machines, setMachines] = useState([]);
  const [techniciens, setTechniciens] = useState([]);
  const [alertes, setAlertes] = useState({ enRetard: [], bientot: [] });
  const [loading, setLoading] = useState(true);

  const [formTarget, setFormTarget] = useState(undefined); // undefined = fermé, null = création, objet = édition
  const [detailPlan, setDetailPlan] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const isManager = currentUser?.role === 'ADMIN' || currentUser?.role === 'RESPONSABLE_MAINTENANCE';
  const isTechnicien = currentUser?.role === 'TECHNICIEN';

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  async function load() {
    setLoading(true);
    try {
      const requests = [apiFetch('/maintenances-preventives')];
      if (currentUser?.role !== 'TECHNICIEN') {
        requests.push(apiFetch('/maintenances-preventives/alertes'));
      }
      const [plansData, alertesData] = await Promise.all(requests);
      setPlans(plansData);
      if (alertesData) setAlertes(alertesData);

      if (isManager) {
        const [machinesData, users] = await Promise.all([apiFetch('/machines'), apiFetch('/auth')]);
        setMachines(machinesData);
        setTechniciens(users.filter((u) => u.role === 'TECHNICIEN'));
      }
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!currentUser) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  async function openDetail(planId) {
    setDetailPlan(null);
    setDetailLoading(true);
    try {
      const details = await apiFetch(`/maintenances-preventives/${planId}`);
      setDetailPlan(details);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await apiFetch(`/maintenances-preventives/${pendingDelete.idPlan}`, { method: 'DELETE' });
      notify('Plan préventif supprimé', 'success');
      setPendingDelete(null);
      load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  }

  if (currentUser && !isManager && !isTechnicien) {
    return (
      <div className="panel">
        <div className="panel-title">Accès restreint</div>
        <p style={{ color: '#767981', fontSize: 14 }}>
          Cette page est réservée à la maintenance et aux techniciens.
        </p>
      </div>
    );
  }

  return (
    <>
      {(alertes.enRetard.length > 0 || alertes.bientot.length > 0) && (
        <div className="panel" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {alertes.enRetard.length > 0 && (
            <span className="badge badge-danger" style={{ fontSize: 13, padding: '6px 12px' }}>
              {alertes.enRetard.length} maintenance(s) en retard
            </span>
          )}
          {alertes.bientot.length > 0 && (
            <span className="badge badge-warning" style={{ fontSize: 13, padding: '6px 12px' }}>
              {alertes.bientot.length} à venir sous 7 jours
            </span>
          )}
        </div>
      )}

      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="panel-title" style={{ marginBottom: 0 }}>
            {isTechnicien ? 'Mes maintenances préventives' : 'Maintenance préventive'}
          </div>
          {isManager && (
            <button className="btn btn-primary" onClick={() => setFormTarget(null)}>
              Nouveau plan
            </button>
          )}
        </div>

        <table>
          <thead>
            <tr>
              <th>Titre</th>
              <th>Machine</th>
              <th>Fréquence</th>
              <th>Prochaine échéance</th>
              <th>Technicien</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTable rows={4} columns={7} />
            ) : plans.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-row">
                  Aucun plan de maintenance préventive pour le moment.
                </td>
              </tr>
            ) : (
              plans.map((plan) => {
                const echeance = echeanceInfo(plan.dateProchaine);
                return (
                  <tr key={plan.idPlan}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{plan.titre}</div>
                      <div style={{ fontSize: 12, color: '#767981' }}>#{plan.idPlan}</div>
                    </td>
                    <td>{plan.machine?.codeMachine || `#${plan.machineId}`}</td>
                    <td>{plan.frequence}</td>
                    <td>
                      {new Date(plan.dateProchaine).toLocaleDateString('fr-FR')}{' '}
                      <span className={`badge ${echeance.badge}`}>{echeance.label}</span>
                    </td>
                    <td>{plan.technicien?.nomUser || '—'}</td>
                    <td>
                      <span className={`badge ${plan.statut === 'ACTIF' ? 'badge-success' : 'badge-neutral'}`}>
                        {plan.statut}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button className="btn btn-ghost" onClick={() => openDetail(plan.idPlan)}>
                          Détails
                        </button>
                        {isManager && (
                          <>
                            <button className="btn btn-secondary" onClick={() => setFormTarget(plan)}>
                              Modifier
                            </button>
                            <button className="btn btn-danger" onClick={() => setPendingDelete(plan)}>
                              Supprimer
                            </button>
                          </>
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

      {formTarget !== undefined && (
        <PlanPreventifModal
          plan={formTarget}
          machines={machines}
          techniciens={techniciens}
          onClose={() => setFormTarget(undefined)}
          onSuccess={() => {
            setFormTarget(undefined);
            load();
          }}
        />
      )}

      <PlanPreventifDetailModal
        plan={detailPlan}
        loading={detailLoading}
        onClose={() => setDetailPlan(null)}
        currentUser={currentUser}
        onRealise={() => {
          setDetailPlan(null);
          load();
        }}
      />

      {pendingDelete && (
        <div className="modal-overlay" onClick={() => setPendingDelete(null)}>
          <div className="modal-box" style={{ width: 'min(440px, 100%)' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Supprimer ce plan ?</div>
            <p style={{ fontSize: 14, color: '#767981' }}>
              Le plan <strong>{pendingDelete.titre}</strong> et son historique de réalisations seront supprimés définitivement.
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setPendingDelete(null)}>Annuler</button>
              <button className="btn btn-danger" disabled={deleting} onClick={handleDelete}>
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}