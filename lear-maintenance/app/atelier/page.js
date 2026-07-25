'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { apiFetch, isLoggedIn } from '../../lib/api';
import { useRouter } from 'next/navigation';

const POLL_INTERVAL_MS = 15000;
const PAGE_SIZE = 3;       // machines max affichées par ligne
const LIGNES_PAR_PAGE = 3; // lignes max affichées par colonne-projet


const STATUT_INFO = {
  ACTIF: { label: 'Marche', badge: 'badge-success' },
  EN_PANNE: { label: 'Panne', badge: 'badge-danger' },
  MAINTENANCE: { label: 'Maintenance', badge: 'badge-warning' },
};

function formatDuree(dateDebut) {
  const minutes = Math.floor((Date.now() - new Date(dateDebut).getTime()) / 60000);
  if (minutes < 60) return `${minutes} min`;
  const heures = Math.floor(minutes / 60);
  const reste = minutes % 60;
  return `${heures} h ${reste.toString().padStart(2, '0')}`;
}

function chunk(array, size) {
  if (size <= 0) return array.length ? [array] : [];
  const pages = [];
  for (let i = 0; i < array.length; i += size) {
    pages.push(array.slice(i, i + size));
  }
  return pages.length ? pages : [[]];
}

function MachineCard({ machine }) {
  const info = STATUT_INFO[machine.statutMachine] || STATUT_INFO.ACTIF;
  const critique = machine.panneActive?.priorite === 'CRITIQUE';

  return (
    <div
      className="panel"
      style={{
        padding: '8px 12px',
        marginBottom: 0,
        minWidth: 0,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        border: `1px solid var(--${machine.statutMachine === 'EN_PANNE' ? 'lear-red' : 'warning'})`,
        outline: critique ? '2px solid var(--lear-red)' : undefined,
        outlineOffset: critique ? '-1px' : undefined,
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
          <span style={{ fontWeight: 600, fontSize: 13, flexShrink: 0 }}>{machine.codeMachine}</span>
          <span style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {machine.panneActive?.titre || machine.nomMachine}
          </span>
        </div>
        {machine.panneActive && (
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
            Depuis {formatDuree(machine.panneActive.dateCreation)}
          </div>
        )}
      </div>
      <span
        className={`badge ${info.badge}`}
        style={{ flexShrink: 0, whiteSpace: 'nowrap', textAlign: 'center' }}
      >
        {info.label}
      </span>
    </div>
  );
}

function PaginationDots({ count, activeIndex }) {
  if (count <= 1) return null;
  return (
    <div style={{ display: 'flex', gap: 4 }} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            flexShrink: 0,
            background: i === activeIndex ? 'var(--text-primary, #333)' : 'var(--border)',
          }}
        />
      ))}
    </div>
  );
}

function LigneBloc({ ligneGroup, tick }) {
  const pinned = useMemo(
    () => ligneGroup.machines.filter((m) => m.panneActive?.priorite === 'CRITIQUE'),
    [ligneGroup.machines]
  );
  const rotatives = useMemo(
    () => ligneGroup.machines.filter((m) => m.panneActive?.priorite !== 'CRITIQUE'),
    [ligneGroup.machines]
  );

  const slotsRestants = Math.max(PAGE_SIZE - pinned.length, 0);
  const pages = useMemo(() => chunk(rotatives, slotsRestants || 1), [rotatives, slotsRestants]);
  const pageIndex = slotsRestants > 0 ? tick % pages.length : 0;
  const machinesAffichees = slotsRestants > 0 ? [...pinned, ...pages[pageIndex]] : pinned;

  return (
    <div style={{ marginBottom: 10, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <h3 style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>Ligne {ligneGroup.ligne}</h3>
        <PaginationDots count={slotsRestants > 0 ? pages.length : 1} activeIndex={pageIndex} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {machinesAffichees.map((m) => (
          <MachineCard key={m.idMachine} machine={m} />
        ))}
      </div>
    </div>
  );
}

function ProjetColonne({ groupeProjet, tick }) {
  // Rotation au niveau des LIGNES : si un projet a plus de LIGNES_PAR_PAGE lignes en alerte,
  // on en affiche seulement une partie à la fois, pour ne jamais dépasser la hauteur de l'écran.
  const pagesLignes = useMemo(
    () => chunk(groupeProjet.lignes, LIGNES_PAR_PAGE),
    [groupeProjet.lignes]
  );
  const pageIndex = tick % pagesLignes.length;
  const lignesAffichees = pagesLignes[pageIndex];

  return (
    <div
      className="panel"
      style={{ marginBottom: 0, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 10 }}>
        <h2 style={{ fontSize: 16, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          Projet {groupeProjet.projet}
        </h2>
        <PaginationDots count={pagesLignes.length} activeIndex={pageIndex} />
      </div>
      <div style={{ overflow: 'hidden' }}>
        {lignesAffichees.map((ligneGroup) => (
          <LigneBloc key={ligneGroup.ligne} ligneGroup={ligneGroup} tick={tick} />
        ))}
      </div>
    </div>
  );
}

export default function AtelierPage() {
  const router = useRouter();
  const [etat, setEtat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tick, setTick] = useState(0);
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
      // Écran passif : réessai au prochain cycle sans toast d'erreur accumulé.
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(() => {
      load();
      setTick((t) => t + 1);
    }, POLL_INTERVAL_MS);
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

  const projetsGroupes = useMemo(() => {
    if (!etat?.lignes) return [];

    const parProjet = new Map();
    for (const ligneGroup of etat.lignes) {
      const machinesEnAlerte = ligneGroup.machines.filter((m) => m.statutMachine !== 'ACTIF');
      if (machinesEnAlerte.length === 0) continue;

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
    <div
      ref={containerRef}
      style={{
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--panel)',
        padding: '20px 28px',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexShrink: 0 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>Tableau de bord atelier</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 12 }}>
            <Link href="/dashboard" style={{ color: 'var(--muted)' }}>← Retour au dashboard</Link>
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.1 }}>
              {now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10, marginBottom: 16, flexShrink: 0 }}>
            <div className="panel" style={{ marginBottom: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Machines actives</div>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{etat.resume.actives} / {etat.resume.total}</div>
            </div>
            <div className="panel" style={{ marginBottom: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>En panne</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--lear-red)' }}>{etat.resume.enPanne}</div>
            </div>
            <div className="panel" style={{ marginBottom: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>En maintenance</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--warning)' }}>{etat.resume.enMaintenance}</div>
            </div>
            <div className="panel" style={{ marginBottom: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Disponibilité</div>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{etat.resume.disponibilite}%</div>
            </div>
          </div>

          {projetsGroupes.length === 0 ? (
            <div className="panel">
              <p style={{ margin: 0, color: 'var(--muted)' }}>Aucune panne ni maintenance en cours. Tout roule 🎉</p>
            </div>
          ) : (
            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: 'grid',
                gridTemplateColumns: `repeat(${projetsGroupes.length}, minmax(0, 1fr))`,
                gap: 16,
              }}
            >
              {projetsGroupes.map((groupeProjet) => (
                <ProjetColonne key={groupeProjet.projet} groupeProjet={groupeProjet} tick={tick} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}