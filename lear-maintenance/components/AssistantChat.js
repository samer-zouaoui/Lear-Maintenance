'use client';

import { useState, useRef, useEffect } from 'react';
import { apiFetch } from '../lib/api';

export default function AssistantChat() {
  const [ouvert, setOuvert] = useState(false);
  const [messages, setMessages] = useState([]);
  const [saisie, setSaisie] = useState('');
  const [chargement, setChargement] = useState(false);
  const finDesMessages = useRef(null);

  useEffect(() => {
    finDesMessages.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, ouvert]);

  async function envoyerMessage(e) {
    e.preventDefault();
    const question = saisie.trim();
    if (!question || chargement) return;

    const nouveauxMessages = [...messages, { role: 'user', content: question }];
    setMessages(nouveauxMessages);
    setSaisie('');
    setChargement(true);

    try {
      const resultat = await apiFetch('/assistant/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: question,
          historique: nouveauxMessages.slice(-8), // garde un contexte court, pas tout l'historique
        }),
      });
      setMessages((m) => [...m, { role: 'assistant', content: resultat.reponse }]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', content: `Erreur : ${err.message}` }]);
    } finally {
      setChargement(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOuvert((o) => !o)}
        style={{
          position: 'fixed', bottom: 24, right: 24, width: 56, height: 56, borderRadius: '50%',
          background: 'var(--lear-red)', color: '#fff', border: 'none', fontSize: 24,
          cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 1000,
        }}
        aria-label="Assistant IA"
      >
        {ouvert ? '×' : '💬'}
      </button>

      {ouvert && (
        <div
          style={{
            position: 'fixed', bottom: 92, right: 24, width: 360, height: 480,
            background: '#fff', borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
            display: 'flex', flexDirection: 'column', zIndex: 1000, overflow: 'hidden',
          }}
        >
          <div style={{ padding: '14px 16px', background: 'var(--lear-red)', color: '#fff', fontWeight: 600 }}>
            Assistant Lear Maintenance
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.length === 0 && (
              <p style={{ color: '#767981', fontSize: 13 }}>
                Pose-moi une question sur les pannes, les machines, les statistiques, ou demande-moi comment utiliser l&apos;application.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  background: m.role === 'user' ? 'var(--lear-red)' : '#F2F2F3',
                  color: m.role === 'user' ? '#fff' : '#1a1a1a',
                  padding: '8px 12px', borderRadius: 12, maxWidth: '85%', fontSize: 13.5, lineHeight: 1.5,
                  whiteSpace: 'pre-line',
                }}
              >
                {m.content}
              </div>
            ))}
            {chargement && (
              <div style={{ alignSelf: 'flex-start', color: '#767981', fontSize: 13 }}>L&apos;assistant réfléchit...</div>
            )}
            <div ref={finDesMessages} />
          </div>

          <form onSubmit={envoyerMessage} style={{ display: 'flex', borderTop: '1px solid #eee', padding: 8, gap: 8 }}>
            <input
              value={saisie}
              onChange={(e) => setSaisie(e.target.value)}
              placeholder="Pose ta question..."
              style={{ flex: 1, border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13.5 }}
              disabled={chargement}
            />
            <button className="btn btn-primary" disabled={chargement || !saisie.trim()}>Envoyer</button>
          </form>
        </div>
      )}
    </>
  );
}