'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, setToken } from '../../lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    nomUser: '',
    email: '',
    motDePasse: '',
    role: 'TECHNICIEN',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      // Une fois inscrit, on connecte directement l'utilisateur
      const loginData = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: form.email, password: form.motDePasse }),
      });
      setToken(loginData.token);
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-brand">
          LEAR<span>.</span>
        </div>
        <div className="login-subtitle">Maintenance Industrielle — Créer un compte</div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label>Nom complet</label>
            <input
              value={form.nomUser}
              onChange={(e) => updateField('nomUser', e.target.value)}
              placeholder="Ex: Dupont Jean"
              required
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="nom@lear.com"
              required
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label>Mot de passe</label>
            <input
              type="password"
              value={form.motDePasse}
              onChange={(e) => updateField('motDePasse', e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Création...' : 'Créer mon compte'}
          </button>
        </form>

        <p style={{ fontSize: 13, color: '#767981', marginTop: 18, textAlign: 'center' }}>
          Déjà un compte ? <a href="/login" style={{ color: '#C8102E', fontWeight: 600 }}>Se connecter</a>
        </p>
      </div>
    </div>
  );
}
