'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch, getCurrentUser, isLoggedIn } from '../../../lib/api';
import { useToast } from '../../../components/ToastProvider';

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

export default function MachineMobilePage() {
  const { id } = useParams();
  const router = useRouter();
  const notify = useToast();
  const [currentUser, setCurrentUser] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [justeDeclare, setJusteDeclare] = useState(false);
  const [declareForm, setDeclareForm] = useState({ titre: TITRES[0], priorite: 'MOYENNE', categorie: CATEGORIES[0] });
  const [clotureForm, setClotureForm] = useState({ diagnostic: '', causeRacine: '', solutionAppliquee: '', piecesUtilisee: '' });
  const [suggestionIA, setSuggestionIA] = useState(null);
  const [chargementSuggestion, setChargementSuggestion] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace(`/login?redirect=/m/${id}`);
      return;
    }
    setCurrentUser(getCurrentUser());
  }, [id, router]);

  async function load() {
    setLoading(true);
    try {
      const result = await apiFetch(`/machines/${id}/mobile`);
      setData(result);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (currentUser) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, id]);

  async function handleDeclarer(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch('/pannes', {
        method: 'POST',
        body: JSON.stringify({ ...declareForm, machineId: Number(id), statutPanne: 'NOUVEAU' }),
      });
      notify('Panne déclarée', 'success');
      setDeclareForm({ titre: TITRES[0], priorite: 'MOYENNE', categorie: CATEGORIES[0] });
      setJusteDeclare(true);
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePrendreEnCharge() {
    setSubmitting(true);
    try {
      await apiFetch(`/pannes/${data.panneActive.idPanne}/prendre-en-charge`, { method: 'PUT' });
      notify('Panne prise en charge', 'success');
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function chargerSuggestionIA() {
    setChargementSuggestion(true);
    try {
      const params = new URLSearchParams({
        titre: panneActive.titre,
        categorie: panneActive.categorie || '',
        machineCode: machine.codeMachine,
      });
      const resultat = await apiFetch(`/pannes/suggestion-ia?${params}`);
      setSuggestionIA(resultat);
      if (resultat.suggestionDisponible) {
        setClotureForm((f) => ({
          ...f,
          diagnostic: resultat.suggestion.diagnostic,
          causeRacine: resultat.suggestion.causeRacine,
          solutionAppliquee: resultat.suggestion.solutionAppliquee,
        }));
      }
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setChargementSuggestion(false);
    }
  }

  async function handleCloturer(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch(`/pannes/${data.panneActive.idPanne}/cloturer`, {
        method: 'PUT',
        body: JSON.stringify(clotureForm),
      });
      notify('Panne clôturée', 'success');
      setClotureForm({ diagnostic: '', causeRacine: '', solutionAppliquee: '', piecesUtilisee: '' });
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !data) {
    return <div style={{ padding: 20 }}>Chargement...</div>;
  }

  const { machine, panneActive } = data;
  const estAffecteeAMoi = panneActive?.technicienId === currentUser?.idUser;
  const peutGererPannes = ['TECHNICIEN', 'RESPONSABLE_MAINTENANCE', 'ADMIN'].includes(currentUser?.role);

  if (justeDeclare) {
    return (
      <div style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>
        <div className="panel" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
          <h2 style={{ margin: '0 0 8px' }}>Panne déclarée</h2>
          <p style={{ color: '#767981', fontSize: 14 }}>
            La panne sur {data?.machine.codeMachine} a bien été enregistrée. Un technicien va être affecté.
          </p>
          <button className="btn btn-primary" style={{ width: '100%', marginTop: 12 }} onClick={() => setJusteDeclare(false)}>
            OK
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>
      <div className="panel">
        <div style={{ fontSize: 12, color: '#767981' }}>
          {machine.ligne.projet.code} — Ligne {machine.ligne.code}
        </div>
        <h1 style={{ fontSize: 20, margin: '4px 0' }}>{machine.codeMachine}</h1>
        <div style={{ fontSize: 14, color: '#767981' }}>{machine.nomMachine} · {machine.zone}</div>
      </div>

      {!panneActive ? (
        <div className="panel">
          <div className="panel-title">Déclarer une panne</div>
          <form onSubmit={handleDeclarer}>
            <label>Titre</label>
            <select
              value={declareForm.titre}
              onChange={(e) => setDeclareForm((f) => ({ ...f, titre: e.target.value }))}
              style={{ marginBottom: 10 }}
            >
              {TITRES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <label>Catégorie</label>
            <select
              value={declareForm.categorie}
              onChange={(e) => setDeclareForm((f) => ({ ...f, categorie: e.target.value }))}
              style={{ marginBottom: 10 }}
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <label>Priorité</label>
            <select
              value={declareForm.priorite}
              onChange={(e) => setDeclareForm((f) => ({ ...f, priorite: e.target.value }))}
              style={{ marginBottom: 14 }}
            >
              <option value="CRITIQUE">Critique</option>
              <option value="HAUTE">Haute</option>
              <option value="MOYENNE">Moyenne</option>
              <option value="BASSE">Basse</option>
            </select>
            <button className="btn btn-primary" disabled={submitting} style={{ width: '100%' }}>
              {submitting ? 'Envoi...' : 'Déclarer la panne'}
            </button>
          </form>
        </div>
      ) : !panneActive.technicienId ? (
        <div className="panel">
          <div className="panel-title">Panne en cours — non affectée</div>
          <p>{panneActive.titre}</p>
          {peutGererPannes ? (
            <button className="btn btn-primary" disabled={submitting} onClick={handlePrendreEnCharge} style={{ width: '100%' }}>
              {submitting ? 'Chargement...' : 'Prendre en charge'}
            </button>
          ) : (
            <p style={{ fontSize: 13, color: '#767981' }}>Un technicien va être affecté à cette panne.</p>
          )}
        </div>
      ) : estAffecteeAMoi && peutGererPannes ? (
        <div className="panel">
          <div className="panel-title">Clôturer cette panne</div>
          <p>{panneActive.titre}</p>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={chargementSuggestion}
            onClick={chargerSuggestionIA}
            style={{ width: '100%', marginBottom: 14 }}
          >
            {chargementSuggestion ? 'Analyse en cours...' : '💡 Suggestion IA'}
          </button>
          {suggestionIA && !suggestionIA.suggestionDisponible && (
            <p style={{ fontSize: 12, color: '#767981', marginBottom: 10 }}>{suggestionIA.message}</p>
          )}
          <form onSubmit={handleCloturer}>
            <label>Diagnostic</label>
            <textarea
              rows={2}
              value={clotureForm.diagnostic}
              onChange={(e) => setClotureForm((f) => ({ ...f, diagnostic: e.target.value }))}
              required
              style={{ marginBottom: 10 }}
            />
            <label>Cause racine</label>
            <input
              value={clotureForm.causeRacine}
              onChange={(e) => setClotureForm((f) => ({ ...f, causeRacine: e.target.value }))}
              required
              style={{ marginBottom: 10 }}
            />
            <label>Solution appliquée</label>
            <textarea
              rows={2}
              value={clotureForm.solutionAppliquee}
              onChange={(e) => setClotureForm((f) => ({ ...f, solutionAppliquee: e.target.value }))}
              required
              style={{ marginBottom: 10 }}
            />
            <label>Pièces utilisées (optionnel)</label>
            <input
              value={clotureForm.piecesUtilisee}
              onChange={(e) => setClotureForm((f) => ({ ...f, piecesUtilisee: e.target.value }))}
              style={{ marginBottom: 14 }}
            />
            <button className="btn btn-primary" disabled={submitting} style={{ width: '100%' }}>
              {submitting ? 'Envoi...' : 'Clôturer la panne'}
            </button>
          </form>
        </div>
      ) : (
        <div className="panel">
          <div className="panel-title">Panne en cours</div>
          <p>{panneActive.titre}</p>
          <p style={{ fontSize: 13, color: '#767981' }}>
            Prise en charge par {panneActive.technicien?.nomUser || 'un technicien'}
          </p>
        </div>
      )}
    </div>
  );
}