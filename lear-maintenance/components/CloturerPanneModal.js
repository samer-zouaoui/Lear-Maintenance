'use client';

import { useState } from 'react';
import { apiFetch } from '../lib/api';
import { useToast } from './ToastProvider';

const emptyInterventionForm = {
  diagnostic: '',
  causeRacine: '',
  solutionAppliquee: '',
  piecesUtilisee: '',
  dateDebut: '',
  dateFin: '',
};

export default function CloturerPanneModal({ panne, onClose, onSuccess }) {
  const notify = useToast();
  const [form, setForm] = useState(emptyInterventionForm);
  const [submitting, setSubmitting] = useState(false);
  const [suggestionIA, setSuggestionIA] = useState(null);
  const [chargementSuggestion, setChargementSuggestion] = useState(false);

  if (!panne) return null;

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function chargerSuggestionIA() {
    setChargementSuggestion(true);
    try {
      const params = new URLSearchParams({
        titre: panne.titre,
        categorie: panne.categorie || '',
        machineCode: panne.machine?.codeMachine || '',
      });
      const resultat = await apiFetch(`/pannes/suggestion-ia?${params}`);
      setSuggestionIA(resultat);
      if (resultat.suggestionDisponible) {
        setForm((f) => ({
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

  async function handleSubmit(e) {
    e.preventDefault();

    if (form.dateFin && form.dateFin < form.dateDebut) {
      notify('La date de fin ne peut pas être antérieure à la date de début.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch(`/interventions/panne/${panne.idPanne}/cloturer`, {
        method: 'POST',
        body: JSON.stringify({
          diagnostic: form.diagnostic,
          causeRacine: form.causeRacine,
          solutionAppliquee: form.solutionAppliquee,
          piecesUtilisee: form.piecesUtilisee,
          dateDebut: new Date(form.dateDebut).toISOString(),
          dateFin: form.dateFin ? new Date(form.dateFin).toISOString() : new Date().toISOString(),
        }),
      });
      notify('Panne clôturée avec succès', 'success');
      setForm(emptyInterventionForm);
      onSuccess?.();
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
        style={{ width: 'min(920px, 100%)', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-title">Clôturer la panne #{panne.idPanne}</div>
        <p style={{ fontSize: 13, color: '#767981', marginTop: -4, marginBottom: 16 }}>
          La clôture crée l&apos;intervention puis remet automatiquement la machine à l&apos;état ACTIF.
        </p>

        <button
          type="button"
          className="btn btn-secondary"
          disabled={chargementSuggestion}
          onClick={chargerSuggestionIA}
          style={{ marginBottom: 16 }}
        >
          {chargementSuggestion ? 'Analyse en cours...' : '💡 Suggestion IA'}
        </button>
        {suggestionIA && !suggestionIA.suggestionDisponible && (
          <p style={{ fontSize: 12, color: '#767981', marginTop: -10, marginBottom: 16 }}>{suggestionIA.message}</p>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
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

          <div className="modal-actions" style={{ marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Clôture...' : 'Clôturer la panne'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}