'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { apiFetch, isLoggedIn } from '../../lib/api';
import { useRouter } from 'next/navigation';

const POLL_INTERVAL_MS = 15000;

const STATUT_INFO = {
  ACTIF: { label: 'En marche', badge: 'badge-success' },
  EN_PANNE: { label: 'En panne', badge: 'badge-danger' },
  MAINTENANCE: { label: 'En maintenance', badge: 'badge-warning' },
};

function formatDuree(dateDebut) {
  const minutes = Math.floor((Date.now() - new Date(dateDebut).getTime()) / 60000);
  if (minutes < 60) return `${minutes} min`;
  const heures = Math.floor(minutes / 60);
  const reste = minutes % 60;
  return `${heures} h ${reste.toString().padStart(2, '0')}`;
}

function MachineCard({ machine }) {
  const info = STATUT_INFO[machine.statutMachine] || STATUT_INFO.ACTIF;

  return (
    <div
      className="panel"
      style={{
        padding: '12px 14px',
        marginBottom: 0,
        border: `1px solid var(--${machine.statutMachine === 'EN_PANNE' ? 'lear-red' : 'warning'})`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{machine.codeMachine}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{machine.nomMachine}</div>
        </div>
        <span className={`badge ${info.badge}`}>{info.label}</span>
      </div>

      {machine.panneActive && (
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
          <div>{machine.panneActive.titre}</div>
          <div>Depuis {formatDuree(machine.panneActive.dateCreation)}</div>
          <div>{machine.panneActive.technicien ? `Technicien : ${machine.panneActive.technicien.nomUser}` : 'Non affectée'}</div>
        </div>
      )}
    </div>
  );
}

export default function AtelierPage() {
  const router = useRouter();
  const [etat, setEtat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace('/login');
    }
  }, [router]);

  async function load() {
    try {
      const data = await apiFetch('/dashboard/atelier');
      setEtat(data);
    } catch (err) {
      // Écran passif : pas de toast qui s'accumule, on réessaiera au prochain cycle.
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const clockInterval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  // Regroupe les lignes (qui contiennent déjà leur projet) par projet,
  // et ne garde que les machines qui ont une panne en cours (pas les machines "ACTIF" qui marchent).
  const projetsGroupes = useMemo(() => {
    if (!etat?.lignes) return [];

    const parProjet = new Map();
    for (const ligneGroup of etat.lignes) {
      const machinesEnAlerte = ligneGroup.machines.filter((m) => m.statutMachine !== 'ACTIF');
      if (machinesEnAlerte.length === 0) continue; // ligne sans souci -> pas affichée

      if (!parProjet.has(ligneGroup.projet)) {
        parProjet.set(ligneGroup.projet, { projet: ligneGroup.projet, lignes: [] });
      }
      parProjet.get(ligneGroup.projet).lignes.push({
        ligne: ligneGroup.ligne,
        machines: machinesEnAlerte,
      });
    }
    return Array.from(parProjet.values());
  }, [etat]);

  return (
    <div ref={containerRef} style={{ minHeight: '100vh', background: 'var(--panel)', padding: '24px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24 }}>Tableau de bord atelier</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 13 }}>
            <Link href="/dashboard" style={{ color: 'var(--muted)' }}>← Retour au dashboard</Link>
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 26, fontWeight: 600, lineHeight: 1.1 }}>
              {now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
              {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>
          <button className="btn btn-secondary" onClick={toggleFullscreen}>
            {isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Chargement...</p>
      ) : !etat ? (
        <p style={{ color: 'var(--muted)' }}>Impossible de charger l&apos;état de l&apos;atelier pour le moment.</p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            <div className="panel" style={{ marginBottom: 0 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>Machines actives</div>
              <div style={{ fontSize: 26, fontWeight: 600 }}>{etat.resume.actives} / {etat.resume.total}</div>
            </div>
            <div className="panel" style={{ marginBottom: 0 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>En panne</div>
              <div style={{ fontSize: 26, fontWeight: 600, color: 'var(--lear-red)' }}>{etat.resume.enPanne}</div>
            </div>
            <div className="panel" style={{ marginBottom: 0 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>En maintenance</div>
              <div style={{ fontSize: 26, fontWeight: 600, color: 'var(--warning)' }}>{etat.resume.enMaintenance}</div>
            </div>
            <div className="panel" style={{ marginBottom: 0 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>Disponibilité</div>
              <div style={{ fontSize: 26, fontWeight: 600 }}>{etat.resume.disponibilite}%</div>
            </div>
          </div>

          {projetsGroupes.length === 0 ? (
            <div className="panel">
              <p style={{ margin: 0, color: 'var(--muted)' }}>Aucune panne ni maintenance en cours. Tout roule 🎉</p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${projetsGroupes.length}, 1fr)`,
                gap: 20,
                alignItems: 'start',
              }}
            >
              {projetsGroupes.map((groupeProjet) => (
                <div key={groupeProjet.projet} className="panel" style={{ marginBottom: 0 }}>
                  <h2 style={{ fontSize: 17, marginTop: 0, marginBottom: 14, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                    Projet {groupeProjet.projet}
                  </h2>
                  {groupeProjet.lignes.map((ligneGroup) => (
                    <div key={ligneGroup.ligne} style={{ marginBottom: 16 }}>
                      <h3 style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 8 }}>Ligne {ligneGroup.ligne}</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {ligneGroup.machines.map((m) => (
                          <MachineCard key={m.idMachine} machine={m} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {etat.dernierEvenement && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 24, fontSize: 13, color: 'var(--muted)' }}>
              Dernier événement : {etat.dernierEvenement.details} — {new Date(etat.dernierEvenement.dateAction).toLocaleString('fr-FR')}
            </div>
          )}
        </>
      )}
    </div>
  );
}