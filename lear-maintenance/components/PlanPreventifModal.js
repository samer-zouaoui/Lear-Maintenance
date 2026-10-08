'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { useToast } from './ToastProvider';

const FREQUENCES = [
  { value: 'QUOTIDIENNE', label: 'Quotidienne (1 jour)' },
  { value: 'HEBDOMADAIRE', label: 'Hebdomadaire (7 jours)' },
  { value: 'MENSUELLE', label: 'Mensuelle (30 jours)' },
  { value: 'TRIMESTRIELLE', label: 'Trimestrielle (90 jours)' },
  { value: 'ANNUELLE', label: 'Annuelle (365 jours)' },
];

const emptyForm = {
  titre: '',
  description: '',
  machineId: '',
  frequence: 'MENSUELLE',
  intervalleJours: '',
  technicienId: '',
};

// Modale de création / édition d'un plan de maintenance préventive.
// `plan` = null pour une création, ou l'objet du plan pour une édition.
export default function PlanPreventifModal({ plan, machines, techniciens, onClose, onSuccess }) {
  const notify = useToast();
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const isEdition = Boolean(plan);

  useEffect(() => {
    if (plan) {
      setForm({
        titre: plan.titre,
        description: plan.description || '',
        machineId: String(plan.machineId),
        frequence: plan.frequence,
        intervalleJours: String(plan.intervalleJours),
        technicienId: plan.technicienId ? String(plan.technicienId) : '',
      });
    } else {
      setForm(emptyForm);
    }
  }, [plan]);

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        titre: form.titre,
        description: form.description || null,
        frequence: form.frequence,
        intervalleJours: form.intervalleJours ? parseInt(form.intervalleJours) : undefined,
        technicienId: form.technicienId ? parseInt(form.technicienId) : null,
      };

      if (isEdition) {
        await apiFetch(`/maintenances-preventives/${plan.idPlan}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        notify('Plan préventif mis à jour', 'success');
      } else {
        await apiFetch('/maintenances-preventives', {
          method: 'POST',
          body: JSON.stringify({ ...payload, machineId: parseInt(form.machineId) }),
        });
        notify('Plan préventif créé', 'success');
      }

      onSuccess?.();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ width: 'min(600px, 100%)' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">{isEdition ? 'Modifier le plan préventif' : 'Nouveau plan préventif'}</div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div>
              <label>Titre</label>
              <input value={form.titre} onChange={(e) => updateField('titre', e.target.value)} required />
            </div>
            <div>
              <label>Machine</label>
              <select
                value={form.machineId}
                onChange={(e) => updateField('machineId', e.target.value)}
                disabled={isEdition}
                required
              >
                <option value="">Sélectionner...</option>
                {machines.map((m) => (
                  <option key={m.idMachine} value={m.idMachine}>{m.codeMachine} — {m.nomMachine}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Fréquence</label>
              <select value={form.frequence} onChange={(e) => updateField('frequence', e.target.value)} required>
                {FREQUENCES.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Intervalle (jours) — optionnel, sinon dérivé de la fréquence</label>
              <input
                type="number"
                min="1"
                value={form.intervalleJours}
                onChange={(e) => updateField('intervalleJours', e.target.value)}
                placeholder="ex: 45"
              />
            </div>
            <div>
              <label>Technicien assigné (optionnel)</label>
              <select value={form.technicienId} onChange={(e) => updateField('technicienId', e.target.value)}>
                <option value="">Non assigné</option>
                {techniciens.map((t) => (
                  <option key={t.idUser} value={t.idUser}>{t.nomUser}</option>
                ))}
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label>Description (optionnel)</label>
              <input value={form.description} onChange={(e) => updateField('description', e.target.value)} />
            </div>
          </div>

          <div className="modal-actions" style={{ marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Enregistrement...' : isEdition ? 'Enregistrer' : 'Créer le plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}