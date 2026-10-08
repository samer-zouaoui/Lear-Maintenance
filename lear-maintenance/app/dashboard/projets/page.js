'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch, getCurrentUser } from '../../../lib/api';
import { useToast } from '../../../components/ToastProvider';
import ConfirmModal from '../../../components/ConfirmModal';
import { SkeletonCard } from '../../../components/Skeleton';

const STATUT_OPTIONS = [
  { value: 'actifs', label: 'Projets actifs' },
  { value: 'inactifs', label: 'Projets archivés' },
  { value: 'tous', label: 'Tous' },
];

export default function ProjetsPage() {
  const notify = useToast();
  const [currentUser, setCurrentUser] = useState(null);
  const [projets, setProjets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statutFilter, setStatutFilter] = useState('actifs');

  const [newProjetCode, setNewProjetCode] = useState('');
  const [newProjetNom, setNewProjetNom] = useState('');
  const [creatingProjet, setCreatingProjet] = useState(false);

  const [ligneDraft, setLigneDraft] = useState({}); // { [idProjet]: { code, nom } }
  const [creatingLigneFor, setCreatingLigneFor] = useState(null);

  const [pendingArchive, setPendingArchive] = useState(null); // { type: 'projet'|'ligne', id, label }
  const [archiving, setArchiving] = useState(false);
  const [reactivatingKey, setReactivatingKey] = useState(null);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  const isAdmin = currentUser?.role === 'ADMIN';

  async function loadProjets() {
    setLoading(true);
    try {
      const data = await apiFetch(`/projets?statut=${statutFilter}`);
      setProjets(data);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statutFilter]);

  if (currentUser && !isAdmin) {
    return (
      <div className="panel">
        <div className="panel-title">Accès restreint</div>
        <p style={{ color: '#767981', fontSize: 14 }}>
          Cette page est réservée à l&apos;administration.
        </p>
      </div>
    );
  }

  async function handleCreateProjet(e) {
    e.preventDefault();
    setCreatingProjet(true);
    try {
      await apiFetch('/projets', {
        method: 'POST',
        body: JSON.stringify({ code: newProjetCode.trim(), nom: newProjetNom.trim() || newProjetCode.trim() }),
      });
      setNewProjetCode('');
      setNewProjetNom('');
      notify('Projet créé avec succès', 'success');
      await loadProjets();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setCreatingProjet(false);
    }
  }

  function updateLigneDraft(idProjet, field, value) {
    setLigneDraft((d) => ({ ...d, [idProjet]: { ...d[idProjet], [field]: value } }));
  }

  async function handleCreateLigne(e, idProjet) {
    e.preventDefault();
    const draft = ligneDraft[idProjet] || {};
    if (!draft.code?.trim()) return;
    setCreatingLigneFor(idProjet);
    try {
      await apiFetch('/lignes', {
        method: 'POST',
        body: JSON.stringify({ code: draft.code.trim(), nom: draft.nom?.trim() || null, projetId: idProjet }),
      });
      setLigneDraft((d) => ({ ...d, [idProjet]: { code: '', nom: '' } }));
      notify('Ligne ajoutée avec succès', 'success');
      await loadProjets();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setCreatingLigneFor(null);
    }
  }

  function requestArchiveProjet(projet) {
    setPendingArchive({ type: 'projet', id: projet.idProjet, label: projet.code });
  }

  function requestArchiveLigne(ligne) {
    setPendingArchive({ type: 'ligne', id: ligne.idLigne, label: ligne.code });
  }

  async function confirmArchive() {
    if (!pendingArchive) return;
    setArchiving(true);
    try {
      const path = pendingArchive.type === 'projet' ? `/projets/${pendingArchive.id}` : `/lignes/${pendingArchive.id}`;
      await apiFetch(path, { method: 'DELETE' });
      notify(pendingArchive.type === 'projet' ? 'Projet archivé' : 'Ligne archivée', 'success');
      setPendingArchive(null);
      await loadProjets();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setArchiving(false);
    }
  }

  async function handleReactivateProjet(projet) {
    setReactivatingKey(`projet-${projet.idProjet}`);
    try {
      await apiFetch(`/projets/${projet.idProjet}/reactiver`, { method: 'PUT' });
      notify('Projet réactivé', 'success');
      await loadProjets();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setReactivatingKey(null);
    }
  }

  const totalLignes = useMemo(
    () => projets.reduce((acc, p) => acc + (p.lignes?.length || 0), 0),
    [projets]
  );

  return (
    <>
      <div className="panel">
        <div className="panel-title">Nouveau projet</div>
        <p style={{ fontSize: 12.5, color: '#767981', marginTop: -8, marginBottom: 16 }}>
          Un nouveau projet d&apos;usine (ex: nouvelle ligne de production démarrée). Il apparaît
          aussitôt dans les formulaires de création de machine.
        </p>
        <form onSubmit={handleCreateProjet}>
          <div className="form-grid">
            <div>
              <label>Code projet</label>
              <input
                value={newProjetCode}
                onChange={(e) => setNewProjetCode(e.target.value)}
                placeholder="ex: MBEAM"
                required
              />
            </div>
            <div>
              <label>Nom (optionnel)</label>
              <input
                value={newProjetNom}
                onChange={(e) => setNewProjetNom(e.target.value)}
                placeholder="ex: Projet MBEAM"
              />
            </div>
          </div>
          <button className="btn btn-primary" disabled={creatingProjet}>
            {creatingProjet ? 'Création...' : 'Créer le projet'}
          </button>
        </form>
      </div>

      <div className="panel">
        <div className="panel-title">
          Projets ({projets.length}) — {totalLignes} ligne{totalLignes > 1 ? 's' : ''} au total
        </div>

        <div className="table-toolbar">
          <select value={statutFilter} onChange={(e) => setStatutFilter(e.target.value)}>
            {STATUT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {loading ? (
          <SkeletonCard />
        ) : projets.length === 0 ? (
          <p className="empty-row">Aucun projet pour ce filtre.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {projets.map((projet) => (
              <div key={projet.idProjet} className="panel" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <strong style={{ fontSize: 15 }}>{projet.code}</strong>
                    {projet.nom && projet.nom !== projet.code && (
                      <span style={{ color: '#767981', fontSize: 13 }}> — {projet.nom}</span>
                    )}
                    <span className={`badge ${projet.actif ? 'badge-success' : 'badge-neutral'}`} style={{ marginLeft: 10 }}>
                      {projet.actif ? 'Actif' : 'Archivé'}
                    </span>
                  </div>
                  {projet.actif ? (
                    <button className="btn btn-ghost" onClick={() => requestArchiveProjet(projet)}>
                      Archiver le projet
                    </button>
                  ) : (
                    <button
                      className="btn btn-secondary"
                      disabled={reactivatingKey === `projet-${projet.idProjet}`}
                      onClick={() => handleReactivateProjet(projet)}
                    >
                      {reactivatingKey === `projet-${projet.idProjet}` ? 'Réactivation...' : 'Réactiver'}
                    </button>
                  )}
                </div>

                <table>
                  <thead>
                    <tr>
                      <th>Ligne</th>
                      <th>Nom</th>
                      <th>Statut</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!projet.lignes || projet.lignes.length === 0) && (
                      <tr>
                        <td colSpan={4} className="empty-row">Aucune ligne dans ce projet.</td>
                      </tr>
                    )}
                    {projet.lignes?.map((ligne) => (
                      <tr key={ligne.idLigne}>
                        <td>{ligne.code}</td>
                        <td>{ligne.nom || '—'}</td>
                        <td>
                          <span className={`badge ${ligne.actif ? 'badge-success' : 'badge-neutral'}`}>
                            {ligne.actif ? 'Active' : 'Archivée'}
                          </span>
                        </td>
                        <td>
                          {ligne.actif && (
                            <button className="btn btn-ghost" onClick={() => requestArchiveLigne(ligne)}>
                              Archiver
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {projet.actif && (
                  <form
                    onSubmit={(e) => handleCreateLigne(e, projet.idProjet)}
                    style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'flex-end' }}
                  >
                    <div style={{ flex: 1 }}>
                      <label>Nouvelle ligne (code)</label>
                      <input
                        value={ligneDraft[projet.idProjet]?.code || ''}
                        onChange={(e) => updateLigneDraft(projet.idProjet, 'code', e.target.value)}
                        placeholder="ex: FSB1"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label>Nom (optionnel)</label>
                      <input
                        value={ligneDraft[projet.idProjet]?.nom || ''}
                        onChange={(e) => updateLigneDraft(projet.idProjet, 'nom', e.target.value)}
                      />
                    </div>
                    <button
                      className="btn btn-secondary"
                      disabled={creatingLigneFor === projet.idProjet}
                    >
                      {creatingLigneFor === projet.idProjet ? 'Ajout...' : 'Ajouter la ligne'}
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!pendingArchive}
        title={pendingArchive?.type === 'projet' ? 'Archiver ce projet ?' : 'Archiver cette ligne ?'}
        message={
          pendingArchive
            ? `"${pendingArchive.label}" sera archivé(e) : il/elle n'apparaîtra plus dans les formulaires de création, mais tout l'historique des machines et pannes qui y sont liées reste conservé. Tu pourras le/la réactiver à tout moment.`
            : ''
        }
        confirmLabel="Archiver"
        loadingLabel="Archivage..."
        loading={archiving}
        onConfirm={confirmArchive}
        onCancel={() => setPendingArchive(null)}
      />
    </>
  );
}