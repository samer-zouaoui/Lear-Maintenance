'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch, getCurrentUser } from '../../../lib/api';
import { useToast } from '../../../components/ToastProvider';
import ConfirmModal from '../../../components/ConfirmModal';
import { SkeletonTable } from '../../../components/Skeleton';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';

const STATUT_BADGE = {
  ACTIF: 'badge-success',
  EN_PANNE: 'badge-danger',
  MAINTENANCE: 'badge-warning',
};

const CRITICITE_BADGE = {
  HAUTE: 'badge-danger',
  MOYENNE: 'badge-warning',
  BASSE: 'badge-neutral',
};

const STATUT_OPTIONS = [
  { value: 'actives', label: 'Machines actives' },
  { value: 'archivees', label: 'Machines archivées' },
  { value: 'toutes', label: 'Toutes' },
];

const emptyForm = {
  codeMachine: '',
  nomMachine: '',
  projetId: '',
  ligneId: '',
  zone: '',
  criticite: 'MOYENNE',
  descriptionMachine: '',
};

export default function MachinesPage() {
  const notify = useToast();
  const [currentUser, setCurrentUser] = useState(null);
  const [machines, setMachines] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState('actives');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [reactivatingId, setReactivatingId] = useState(null);
  const [projets, setProjets] = useState([]);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  useEffect(() => {
    apiFetch('/projets').then(setProjets).catch((err) => notify(err.message, 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canManageMachines = currentUser?.role === 'ADMIN' || currentUser?.role === 'RESPONSABLE_MAINTENANCE';

  async function loadMachines() {
    setLoading(true);
    try {
      const data = await apiFetch(`/machines?statut=${statutFilter}`);
      setMachines(data);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMachines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statutFilter]);

  if (currentUser && !canManageMachines) {
    return (
      <div className="panel">
        <div className="panel-title">Accès restreint</div>
        <p style={{ color: '#767981', fontSize: 14 }}>
          Cette page est réservée à l&apos;administration et à la maintenance.
        </p>
      </div>
    );
  }

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const machinesFiltrees = useMemo(() => {
    if (!search.trim()) return machines;
    const q = search.trim().toLowerCase();
    return machines.filter((m) =>
      m.codeMachine.toLowerCase().includes(q) ||
      m.nomMachine.toLowerCase().includes(q) ||
      m.zone.toLowerCase().includes(q)
    );
  }, [machines, search]);

  const lignesDuProjet = useMemo(() => {
    const projet = projets.find((p) => String(p.idProjet) === String(form.projetId));
    return projet ? projet.lignes : [];
  }, [projets, form.projetId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { projetId, ...rest } = form;
      await apiFetch('/machines', {
        method: 'POST',
        body: JSON.stringify({ ...rest, ligneId: Number(form.ligneId), statutMachine: 'ACTIF' }),
      });
      setForm(emptyForm);
      notify('Machine créée avec succès', 'success');
      await loadMachines();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  function requestDelete(machine) {
    setPendingDelete(machine);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await apiFetch(`/machines/${pendingDelete.idMachine}`, { method: 'DELETE' });
      notify('Machine archivée', 'success');
      setPendingDelete(null);
      await loadMachines();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  }

  async function handleReactivate(machine) {
    setReactivatingId(machine.idMachine);
    try {
      await apiFetch(`/machines/${machine.idMachine}/reactiver`, { method: 'PUT' });
      notify('Machine réactivée', 'success');
      await loadMachines();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setReactivatingId(null);
    }
  }

  async function genererQrUnique(machine) {
    const url = `${window.location.origin}/m/${machine.idMachine}`;
    const dataUrl = await QRCode.toDataURL(url, { width: 400, margin: 2 });
    const lien = document.createElement('a');
    lien.href = dataUrl;
    lien.download = `QR_${machine.codeMachine}.png`;
    lien.click();
  }

  async function genererTousLesQr() {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const machinesActives = machines.filter((m) => !m.archivee);
    const parLigne = 3;
    const parColonne = 4;
    const marge = 15;
    const largeurCase = (210 - marge * 2) / parLigne;
    const hauteurCase = (297 - marge * 2) / parColonne;

    for (let i = 0; i < machinesActives.length; i++) {
      const m = machinesActives[i];
      const pageIndex = Math.floor(i / (parLigne * parColonne));
      const indexSurPage = i % (parLigne * parColonne);
      if (indexSurPage === 0 && i !== 0) doc.addPage();

      const col = indexSurPage % parLigne;
      const row = Math.floor(indexSurPage / parLigne);
      const x = marge + col * largeurCase;
      const y = marge + row * hauteurCase;

      const url = `${window.location.origin}/m/${m.idMachine}`;
      const dataUrl = await QRCode.toDataURL(url, { width: 300, margin: 1 });

      const tailleQr = Math.min(largeurCase, hauteurCase) - 14;
      doc.addImage(dataUrl, 'PNG', x + (largeurCase - tailleQr) / 2, y, tailleQr, tailleQr);
      doc.setFontSize(9);
      doc.text(m.codeMachine, x + largeurCase / 2, y + tailleQr + 5, { align: 'center' });
      doc.setFontSize(7);
      doc.text(m.nomMachine, x + largeurCase / 2, y + tailleQr + 9, { align: 'center', maxWidth: largeurCase - 4 });
    }

    doc.save('QR_codes_machines.pdf');
  }

  return (
    <>
      <div className="panel">
        <div className="panel-title">Nouvelle machine</div>
        <p style={{ fontSize: 12.5, color: '#767981', marginTop: -8, marginBottom: 16 }}>
          Toute nouvelle machine est créée avec le statut <strong>Actif</strong> par défaut.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div>
              <label>Code machine</label>
              <input value={form.codeMachine} onChange={(e) => updateField('codeMachine', e.target.value)} required />
            </div>
            <div>
              <label>Nom</label>
              <input value={form.nomMachine} onChange={(e) => updateField('nomMachine', e.target.value)} required />
            </div>
            <div>
              <label>Projet</label>
              <select
                value={form.projetId}
                onChange={(e) => setForm((f) => ({ ...f, projetId: e.target.value, ligneId: '' }))}
                required
              >
                <option value="">-- Choisir un projet --</option>
                {projets.map((p) => (
                  <option key={p.idProjet} value={p.idProjet}>{p.code}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Ligne</label>
              <select
                value={form.ligneId}
                onChange={(e) => updateField('ligneId', e.target.value)}
                disabled={!form.projetId}
                required
              >
                <option value="">-- Choisir une ligne --</option>
                {lignesDuProjet.map((l) => (
                  <option key={l.idLigne} value={l.idLigne}>{l.code}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Zone</label>
              <input value={form.zone} onChange={(e) => updateField('zone', e.target.value)} required />
            </div>
            <div>
              <label>Criticité</label>
              <select value={form.criticite} onChange={(e) => updateField('criticite', e.target.value)}>
                <option value="HAUTE">Haute</option>
                <option value="MOYENNE">Moyenne</option>
                <option value="BASSE">Basse</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label>Description (optionnel)</label>
            <textarea
              rows={2}
              value={form.descriptionMachine}
              onChange={(e) => updateField('descriptionMachine', e.target.value)}
            />
          </div>
          <button className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Création...' : 'Créer la machine'}
          </button>
        </form>
      </div>

      <div className="panel">
        <div className="panel-title">Machines ({machinesFiltrees.length}{machinesFiltrees.length !== machines.length ? ` / ${machines.length}` : ''})</div>

        <div className="table-toolbar">
          <input
            type="search"
            placeholder="Rechercher (code, nom, zone...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={statutFilter} onChange={(e) => setStatutFilter(e.target.value)}>
            {STATUT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button className="btn btn-secondary" onClick={genererTousLesQr}>
            Générer tous les QR codes (PDF)
          </button>
        </div>

        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Nom</th>
              <th>Projet</th>
              <th>Ligne</th>
              <th>Zone</th>
              <th>Statut</th>
              <th>Archivée</th>
              <th>Criticité</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTable rows={5} columns={9} />
            ) : machinesFiltrees.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty-row">
                  {machines.length === 0 ? 'Aucune machine enregistrée pour l\u2019instant.' : 'Aucune machine ne correspond à ta recherche.'}
                </td>
              </tr>
            ) : (
              machinesFiltrees.map((m) => (
                <tr key={m.idMachine}>
                  <td>{m.codeMachine}</td>
                  <td>{m.nomMachine}</td>
                  <td>{m.ligne?.projet?.code}</td>
                  <td>{m.ligne?.code}</td>
                  <td>{m.zone}</td>
                  <td><span className={`badge ${STATUT_BADGE[m.statutMachine] || 'badge-neutral'}`}>{m.statutMachine}</span></td>
                  <td>
                    <span className={`badge ${m.archivee ? 'badge-neutral' : 'badge-success'}`}>
                      {m.archivee ? 'Archivée' : 'Active'}
                    </span>
                  </td>
                  <td><span className={`badge ${CRITICITE_BADGE[m.criticite] || 'badge-neutral'}`}>{m.criticite}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost" onClick={() => genererQrUnique(m)}>QR</button>
                      {m.archivee ? (
                        <button
                          className="btn btn-secondary"
                          disabled={reactivatingId === m.idMachine}
                          onClick={() => handleReactivate(m)}
                        >
                          {reactivatingId === m.idMachine ? 'Réactivation...' : 'Réactiver'}
                        </button>
                      ) : (
                        <button className="btn btn-ghost" onClick={() => requestDelete(m)}>Archiver</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={!!pendingDelete}
        title="Archiver cette machine ?"
        message={
          pendingDelete
            ? `La machine "${pendingDelete.codeMachine} — ${pendingDelete.nomMachine}" sera archivée : elle n'apparaîtra plus dans les listes actives (création de panne, plan préventif), mais tout son historique (pannes, interventions, maintenances) reste conservé. Tu pourras la réactiver à tout moment.`
            : ''
        }
        confirmLabel="Archiver"
        loadingLabel="Archivage..."
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}