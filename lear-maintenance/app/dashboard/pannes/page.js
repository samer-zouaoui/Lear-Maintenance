'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch, apiUpload, API_URL, getCurrentUser } from '../../../lib/api';
import { useToast } from '../../../components/ToastProvider';
import ConfirmModal from '../../../components/ConfirmModal';
import { SkeletonTable } from '../../../components/Skeleton';
import PanneDetailModal from '../../../components/PanneDetailModal';

const STATUT_BADGE = {
  NOUVEAU: 'badge-neutral',
  AFFECTE: 'badge-info',
  EN_COURS: 'badge-warning',
  RESOLU: 'badge-success',
};

const PRIORITE_BADGE = {
  CRITIQUE: 'badge-danger',
  HAUTE: 'badge-danger',
  MOYENNE: 'badge-warning',
  BASSE: 'badge-neutral',
};

const TITRES = [
  'Panne moteur',
  'Fuite hydraulique',
  'Arrêt automate',
  'Défaut capteur',
  'Surchauffe',
  'Bruit anormal',
  'Vibration excessive',
  'Défaut électrique',
  'Blocage mécanique',
  'Autre',
];

const CATEGORIES = ['Mécanique', 'Électrique', 'Hydraulique', 'Pneumatique', 'Automate/Logiciel', 'Autre'];
const STATUTS = ['NOUVEAU', 'AFFECTE', 'EN_COURS', 'RESOLU'];

const emptyForm = {
  titre: TITRES[0],
  categorie: CATEGORIES[0],
  priorite: 'MOYENNE',
  machineId: '',
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

export default function PannesPage() {
  const notify = useToast();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  const isDemandeur = currentUser?.role === 'DEMANDEUR';
  const canManagePannes = currentUser?.role === 'ADMIN' || currentUser?.role === 'RESPONSABLE_MAINTENANCE';
  const canAssign = canManagePannes;

  const [pannes, setPannes] = useState([]);
  const [machines, setMachines] = useState([]);
  const [techniciens, setTechniciens] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [photoFile, setPhotoFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPanne, setSelectedPanne] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function loadAll() {
    try {
      const [pannesData, machinesData] = await Promise.all([
        apiFetch('/pannes'),
        apiFetch('/machines'),
      ]);
      setPannes(pannesData);
      setMachines(machinesData);

      if (canAssign) {
        const users = await apiFetch('/auth');
        setTechniciens(users.filter((u) => u.role === 'TECHNICIEN'));
      }
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  // Recharge les données lorsque l'utilisateur et ses droits d'assignation sont résolus
  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAssign]);

  if (currentUser && !canManagePannes && !isDemandeur) {
    return (
      <div className="panel">
        <div className="panel-title">Accès restreint</div>
        <p style={{ color: '#767981', fontSize: 14 }}>
          Cette page est réservée à l&apos;administration et à la maintenance. Consultez vos pannes dans la section Mes pannes.
        </p>
      </div>
    );
  }

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function machineCode(machineId) {
    return machines.find((m) => m.idMachine === machineId)?.codeMachine || `#${machineId}`;
  }

  function technicienNom(technicienId) {
    if (!technicienId) return null;
    const t = techniciens.find((u) => u.idUser === technicienId);
    return t ? t.nomUser : `#${technicienId}`;
  }

  const machinesActives = machines.filter((m) => m.statutMachine === 'ACTIF');

  const pannesFiltrees = useMemo(() => {
    return pannes.filter((p) => {
      if (statutFilter && p.statutPanne !== statutFilter) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        p.titre.toLowerCase().includes(q) ||
        p.categorie.toLowerCase().includes(q) ||
        machineCode(p.machineId).toLowerCase().includes(q) ||
        (technicienNom(p.technicienId) || '').toLowerCase().includes(q)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pannes, search, statutFilter, machines, techniciens]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const nouvellePanne = await apiFetch('/pannes', {
        method: 'POST',
        body: JSON.stringify({
          titre: form.titre,
          categorie: form.categorie,
          priorite: form.priorite,
          statutPanne: 'NOUVEAU',
          machineId: parseInt(form.machineId),
        }),
      });

      if (photoFile) {
        const formData = new FormData();
        formData.append('photo', photoFile);
        try {
          await apiUpload(`/pannes/${nouvellePanne.idPanne}/photo`, formData);
        } catch (photoErr) {
          notify(`Panne créée, mais l\u2019envoi de la photo a échoué : ${photoErr.message}`, 'error');
        }
      }

      setForm(emptyForm);
      setPhotoFile(null);
      notify('Panne déclarée avec succès', 'success');
      await loadAll();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  function requestDelete(panne) {
    setPendingDelete(panne);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await apiFetch(`/pannes/${pendingDelete.idPanne}`, { method: 'DELETE' });
      notify('Panne supprimée', 'success');
      setPendingDelete(null);
      await loadAll();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  }

  async function handleAssign(panneId, technicienId) {
    if (!technicienId) return;
    try {
      await apiFetch(`/pannes/${panneId}`, {
        method: 'PUT',
        body: JSON.stringify({
          technicienId: parseInt(technicienId),
          statutPanne: 'AFFECTE',
        }),
      });
      notify('Technicien affecté à la panne', 'success');
      await loadAll();
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  async function openPanneDetails(panneId) {
    setDetailLoading(true);
    try {
      const details = await apiFetch(`/pannes/${panneId}/details`);
      setSelectedPanne(details);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setDetailLoading(false);
    }
  }

  if (isDemandeur) {
    return (
      <>
        <div className="panel">
          <div className="panel-title">Déclarer une panne</div>
          <p style={{ fontSize: 13, color: '#767981', marginTop: -6, marginBottom: 16 }}>
            Tu peux uniquement créer une nouvelle panne depuis cette page.
          </p>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div>
                <label>Machine (code — actives uniquement)</label>
                <select value={form.machineId} onChange={(e) => updateField('machineId', e.target.value)} required>
                  <option value="">— Sélectionner —</option>
                  {machinesActives.map((m) => (
                    <option key={m.idMachine} value={m.idMachine}>{m.codeMachine} — {m.nomMachine}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Titre</label>
                <select value={form.titre} onChange={(e) => updateField('titre', e.target.value)}>
                  {TITRES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label>Catégorie</label>
                <select value={form.categorie} onChange={(e) => updateField('categorie', e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label>Priorité</label>
                <select value={form.priorite} onChange={(e) => updateField('priorite', e.target.value)}>
                  <option value="CRITIQUE">Critique</option>
                  <option value="HAUTE">Haute</option>
                  <option value="MOYENNE">Moyenne</option>
                  <option value="BASSE">Basse</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label>Photo (optionnel)</label>
              <input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
              />
              {photoFile && (
                <p style={{ fontSize: 12, color: '#767981', marginTop: 4 }}>{photoFile.name}</p>
              )}
            </div>
            {machinesActives.length === 0 && (
              <p style={{ fontSize: 13, color: '#767981', marginBottom: 12 }}>
                Aucune machine active disponible.
              </p>
            )}
            <button className="btn btn-primary" disabled={submitting || machinesActives.length === 0}>
              {submitting ? 'Création...' : 'Déclarer la panne'}
            </button>
          </form>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="panel">
        <div className="panel-title">Déclarer une panne</div>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div>
              <label>Machine (code — actives uniquement)</label>
              <select value={form.machineId} onChange={(e) => updateField('machineId', e.target.value)} required>
                <option value="">— Sélectionner —</option>
                {machinesActives.map((m) => (
                  <option key={m.idMachine} value={m.idMachine}>{m.codeMachine} — {m.nomMachine}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Titre</label>
              <select value={form.titre} onChange={(e) => updateField('titre', e.target.value)}>
                {TITRES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label>Catégorie</label>
              <select value={form.categorie} onChange={(e) => updateField('categorie', e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label>Priorité</label>
              <select value={form.priorite} onChange={(e) => updateField('priorite', e.target.value)}>
                <option value="CRITIQUE">Critique</option>
                <option value="HAUTE">Haute</option>
                <option value="MOYENNE">Moyenne</option>
                <option value="BASSE">Basse</option>
              </select>
            </div>
          </div> 
          
          {machinesActives.length === 0 && (
            <p style={{ fontSize: 13, color: '#767981', marginBottom: 12 }}>
              Aucune machine active disponible (toutes sont déjà en panne ou en maintenance).
            </p>
          )}
          <button className="btn btn-primary" disabled={submitting || machinesActives.length === 0}>
            {submitting ? 'Création...' : 'Déclarer la panne'}
          </button>
        </form>
      </div>

      <div className="panel">
        <div className="panel-title">Pannes ({pannesFiltrees.length}{pannesFiltrees.length !== pannes.length ? ` / ${pannes.length}` : ''})</div>

        <div className="table-toolbar">
          <input
            type="search"
            placeholder="Rechercher (titre, machine, technicien...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={statutFilter} onChange={(e) => setStatutFilter(e.target.value)}>
            <option value="">Tous les statuts</option>
            {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <table>
          <thead>
            <tr>
              <th>Titre</th>
              <th>Catégorie</th>
              <th>Priorité</th>
              <th>Statut</th>
              <th>Machine</th>
              <th>Technicien</th>
              {canAssign && <th>Affecter</th>}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTable rows={5} columns={canAssign ? 8 : 7} />
            ) : pannesFiltrees.length === 0 ? (
              <tr>
                <td colSpan={canAssign ? 8 : 7} className="empty-row">
                  {pannes.length === 0 ? 'Aucune panne déclarée pour l\u2019instant.' : 'Aucune panne ne correspond à ta recherche.'}
                </td>
              </tr>
            ) : (
              pannesFiltrees.map((p) => {
                const isResolue = p.statutPanne === 'RESOLU';
                return (
                  <tr key={p.idPanne}>
                    <td>{p.titre}</td>
                    <td>{p.categorie}</td>
                    <td><span className={`badge ${PRIORITE_BADGE[p.priorite] || 'badge-neutral'}`}>{p.priorite}</span></td>
                    <td><StatutBadge statut={p.statutPanne} /></td>
                    <td>{machineCode(p.machineId)}</td>
                    <td>{technicienNom(p.technicienId) || <span style={{ color: '#767981' }}>Non affecté</span>}</td>
                    {canAssign && (
                      <td>
                        {isResolue ? (
                          <span style={{ color: '#767981', fontSize: 12.5 }}>—</span>
                        ) : (
                          <select
                            defaultValue=""
                            onChange={(e) => handleAssign(p.idPanne, e.target.value)}
                            style={{ fontSize: 12.5, padding: '6px 8px' }}
                          >
                            <option value="">Affecter à...</option>
                            {techniciens.map((t) => (
                              <option key={t.idUser} value={t.idUser}>{t.nomUser}</option>
                            ))}
                          </select>
                        )}
                      </td>
                    )}
                    <td>
                      {isResolue ? (
                        <button className="btn btn-ghost" onClick={() => openPanneDetails(p.idPanne)}>
                          Voir détails
                        </button>
                      ) : (
                        <button className="btn btn-ghost" onClick={() => requestDelete(p)}>
                          Supprimer
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <PanneDetailModal
        panne={selectedPanne}
        loading={detailLoading}
        onClose={() => setSelectedPanne(null)}
      />

      <ConfirmModal
        open={!!pendingDelete}
        title="Supprimer cette panne ?"
        message={pendingDelete ? `La panne "${pendingDelete.titre}" (#${pendingDelete.idPanne}) sera définitivement supprimée. Cette action est irréversible.` : ''}
        confirmLabel="Supprimer"
        loadingLabel="Suppression..."
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}