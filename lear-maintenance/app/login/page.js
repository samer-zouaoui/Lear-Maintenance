'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, setToken } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setToken(data.token);
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
        <div className="login-subtitle">Maintenance Industrielle — Connexion</div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nom@lear.com"
              required
            />
          </div>
          <div style={{ marginBottom: 22 }}>
            <label>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p style={{ fontSize: 13, color: '#767981', marginTop: 18, textAlign: 'center' }}>
          Pas encore de compte ? <a href="/register" style={{ color: '#C8102E', fontWeight: 600 }}>Créer un compte</a>
        </p>
      </div>
    </div>
  );
}
