'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link'; // Importation de Link pour éviter les rechargements de page complets
import { apiFetch, clearToken, getCurrentUser } from '../../lib/api';
import { disconnectSocket } from '../../lib/socket';
import ThemeToggle from '../../components/ThemeToggle';
import UserAvatar from '../../components/UserAvatar';
import NotificationBell from '../../components/NotificationBell';
import AssistantChat from '../../components/AssistantChat';

const ADMIN_ROLES = ['ADMIN'];
const MAINTENANCE_ROLES = ['ADMIN', 'RESPONSABLE_MAINTENANCE'];
const TECHNICIEN_ROLES = ['TECHNICIEN'];
const DEMANDEUR_ROLES = ['DEMANDEUR'];

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  // Le token ne contient que { idUser, role } : on va chercher le nom complet pour l'avatar/l'accueil.
  useEffect(() => {
    if (!currentUser?.idUser) return;
    apiFetch(`/auth/${currentUser.idUser}`)
      .then(setProfile)
      .catch(() => {});
  }, [currentUser?.idUser]);

  // Ferme automatiquement le menu mobile à chaque changement de page.
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const isAdmin = ADMIN_ROLES.includes(currentUser?.role);
  const isTechnicien = TECHNICIEN_ROLES.includes(currentUser?.role);
  const isDemandeur = DEMANDEUR_ROLES.includes(currentUser?.role);
  const canSeePannes = MAINTENANCE_ROLES.includes(currentUser?.role);

  let navItems = [];
  if (canSeePannes) {
    navItems = [
      { href: '/dashboard', label: 'Vue d’ensemble' },
      { href: '/dashboard/machines', label: 'Machines' },
      { href: '/dashboard/pannes', label: 'Pannes' },
      { href: '/dashboard/interventions', label: 'Interventions' },
      { href: '/dashboard/maintenance-preventive', label: 'Maintenance préventive' },
    ];
  } else if (isTechnicien) {
    navItems = [
      { href: '/dashboard/mes-pannes', label: 'Mes pannes' },
      { href: '/dashboard/maintenance-preventive', label: 'Maintenance préventive' },
    ];
  } else if (isDemandeur) {
    navItems = [{ href: '/dashboard/pannes', label: 'Créer une panne' }];
  }

  if (isAdmin) {
    navItems.push({ href: '/dashboard/users', label: 'Utilisateurs' });
    navItems.push({ href: '/dashboard/projets', label: 'Projets & Lignes' });
    navItems.push({ href: '/dashboard/rapport-ia', label: 'Rapport IA' });
  }

  navItems.push({ href: '/atelier', label: 'Écran atelier' });

  function handleLogout() {
    clearToken();
    disconnectSocket();
    router.push('/login');
  }

  const currentLabel =
    navItems.slice().reverse().find((item) => pathname.startsWith(item.href))?.label ||
    'Vue d’ensemble';

  const displayName = profile?.nomUser || '';

  return (
    <div className="app-shell">
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="wordmark">
            LEAR<span>.</span>
          </div>
          <div className="subtitle">Maintenance</div>
        </div>

        <nav>
          {navItems.map((item) => {
            const active =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${active ? 'active' : ''}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <UserAvatar name={displayName} />
            <div>
              <div className="sidebar-user-name">{displayName || 'Utilisateur'}</div>
              <div className="sidebar-user-role">{currentUser?.role}</div>
            </div>
          </div>
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="btn btn-ghost"
            style={{ color: 'rgba(255,255,255,0.65)', padding: '10px 0' }}
          >
            Déconnexion
          </button>
        </div>
      </aside>

      <div className="main-area">
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className="burger-btn"
              onClick={() => setSidebarOpen((open) => !open)}
              aria-label="Ouvrir le menu"
            >
              <span />
              <span />
              <span />
            </button>
            <h1>{currentLabel}</h1>
          </div>
          <NotificationBell />
        </div>
        <div className="content">{children}</div>
      </div>
      <AssistantChat />
    </div>
  );
}