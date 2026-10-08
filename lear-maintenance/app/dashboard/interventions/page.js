'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch, getCurrentUser } from '../../../lib/api';
import { useToast } from '../../../components/ToastProvider';
import ConfirmModal from '../../../components/ConfirmModal';
import { SkeletonTable } from '../../../components/Skeleton';

const emptyForm = {
  diagnostic: '',
  causeRacine: '',
  solutionAppliquee: '',
  piecesUtilisee: '',
  dateDebut: '',
  dateFin: '',
  panneId: '',
};

const INTERVENTIONS_ROLES = ['ADMIN', 'RESPONSABLE_MAINTENANCE'];

export default function InterventionsPage() {
  const notify = useToast();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  const [interventions, setInterventions] = useState([]);
  const [pannes, setPannes] = useState([]);
  const [durees, setDurees] = useState({});
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function loadAll() {
    try {
      const isTechnicien = currentUser?.role === 'TECHNICIEN';
      const [interventionsData, pannesData] = await Promise.all([
        apiFetch(isTechnicien ? '/interventions/me' : '/interventions'),
        apiFetch(isTechnicien ? '/pannes/me' : '/pannes'),
      ]);
      setInterventions(interventionsData);
      setPannes(pannesData);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (currentUser) {
      loadAll();
    }
  }, [currentUser]);

  if (currentUser && !INTERVENTIONS_ROLES.includes(currentUser?.role)) {
    return (
      <div className="panel">
        <div className="panel-title">Accès restreint</div>
        <p style={{ color: '#767981', fontSize: 14 }}>
          Cette section est réservée aux rôles Admin, Responsable Maintenance et Technicien.
        </p>
      </div>
    );
  }

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function panneLabel(panneId) {
    const p = pannes.find((x) => x.idPanne === panneId);
    return p ? `#${p.idPanne} — ${p.titre}` : `#${panneId}`;
  }

  const pannesAffectables = pannes.filter((p) => ['AFFECTE', 'EN_COURS'].includes(p.statutPanne));

  const interventionsFiltrees = useMemo(() => {
    if (!search.trim()) return interventions;
    const q = search.trim().toLowerCase();
    return interventions.filter((i) =>
      i.diagnostic.toLowerCase().includes(q) ||
      i.causeRacine.toLowerCase().includes(q) ||
      panneLabel(i.panneId).toLowerCase().includes(q)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interventions, search, pannes]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.dateFin && form.dateFin < form.dateDebut) {
      notify('La date de fin ne peut pas être antérieure à la date de début.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch('/interventions', {
        method: 'POST',
        body: JSON.stringify({
          diagnostic: form.diagnostic,
          causeRacine: form.causeRacine,
          solutionAppliquee: form.solutionAppliquee,
          piecesUtilisee: form.piecesUtilisee,
          panneId: parseInt(form.panneId),
          technicienId: currentUser.idUser,
          dateDebut: new Date(form.dateDebut).toISOString(),
          dateFin: form.dateFin ? new Date(form.dateFin).toISOString() : null,
        }),
      });
      setForm(emptyForm);
      notify('Intervention créée avec succès', 'success');
      await loadAll();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  function requestDelete(intervention) {
    setPendingDelete(intervention);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await apiFetch(`/interventions/${pendingDelete.idIntervention}`, { method: 'DELETE' });
      notify('Intervention supprimée', 'success');
      setPendingDelete(null);
      await loadAll();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  }

  async function handleVoirDuree(id) {
    try {
      const data = await apiFetch(`/interventions/${id}/duree`);
      setDurees((d) => ({ ...d, [id]: data.duree }));
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  return (
    <>
      <div className="panel">
        <div className="panel-title">Nouvelle intervention</div>
        <p style={{ fontSize: 12.5, color: '#767981', marginTop: -8, marginBottom: 16 }}>
          Intervention enregistrée sous ton compte connecté ({currentUser?.role}) et limitée à tes pannes affectées.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div>
              <label>Panne concernée</label>
              <select value={form.panneId} onChange={(e) => updateField('panneId', e.target.value)} required>
                <option value="">— Sélectionner —</option>
                {pannesAffectables.map((p) => (
                  <option key={p.idPanne} value={p.idPanne}>#{p.idPanne} — {p.titre}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Diagnostic</label>
              <input value={form.diagnostic} onChange={(e) => updateField('diagnostic', e.target.value)} required />
            </div>
            <div>
              <label>Cause racine</label>
              <input value={form.causeRacine} onChange={(e) => updateField('causeRacine', e.target.value)} required />
            </div>
            <div>
              <label>Solution appliquée</label>
              <input value={form.solutionAppliquee} onChange={(e) => updateField('solutionAppliquee', e.target.value)} required />
            </div>
            <div>
              <label>Pièces utilisées</label>
              <input value={form.piecesUtilisee} onChange={(e) => updateField('piecesUtilisee', e.target.value)} />
            </div>
            <div>
              <label>Date début</label>
              <input type="datetime-local" value={form.dateDebut} onChange={(e) => updateField('dateDebut', e.target.value)} required />
            </div>
            <div>
              <label>Date fin (optionnel)</label>
              <input
                type="datetime-local"
                value={form.dateFin}
                min={form.dateDebut || undefined}
                onChange={(e) => updateField('dateFin', e.target.value)}
              />
            </div>
          </div>
          {pannesAffectables.length === 0 && (
            <p style={{ fontSize: 13, color: '#767981', marginBottom: 12 }}>
              Aucune panne en attente d&apos;intervention pour le moment.
            </p>
          )}
          <button className="btn btn-primary" disabled={submitting || pannesAffectables.length === 0}>
            {submitting ? 'Création...' : 'Créer l\u2019intervention'}
          </button>
        </form>
      </div>

      <div className="panel">
        <div className="panel-title">Interventions ({interventionsFiltrees.length}{interventionsFiltrees.length !== interventions.length ? ` / ${interventions.length}` : ''})</div>

        <div className="table-toolbar">
          <input
            type="search"
            placeholder="Rechercher (diagnostic, cause, panne...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <table>
          <thead>
            <tr>
              <th>Diagnostic</th>
              <th>Panne</th>
              <th>Début</th>
              <th>Fin</th>
              <th>Durée (h)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTable rows={5} columns={6} />
            ) : interventionsFiltrees.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-row">
                  {interventions.length === 0 ? 'Aucune intervention enregistrée pour l\u2019instant.' : 'Aucune intervention ne correspond à ta recherche.'}
                </td>
              </tr>
            ) : (
              interventionsFiltrees.map((i) => (
                <tr key={i.idIntervention}>
                  <td>{i.diagnostic}</td>
                  <td>{panneLabel(i.panneId)}</td>
                  <td>{new Date(i.dateDebut).toLocaleString('fr-FR')}</td>
                  <td>{i.dateFin ? new Date(i.dateFin).toLocaleString('fr-FR') : '—'}</td>
                  <td>
                    {durees[i.idIntervention] !== undefined ? (
                      <span className="badge badge-info">{durees[i.idIntervention]} h</span>
                    ) : (
                      <button className="btn btn-ghost" onClick={() => handleVoirDuree(i.idIntervention)}>Calculer</button>
                    )}
                  </td>
                  <td>
                    <button className="btn btn-ghost" onClick={() => requestDelete(i)}>Supprimer</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={!!pendingDelete}
        title="Supprimer cette intervention ?"
        message={pendingDelete ? `L'intervention "${pendingDelete.diagnostic}" sera définitivement supprimée. Cette action est irréversible.` : ''}
        confirmLabel="Supprimer"
        loadingLabel="Suppression..."
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
