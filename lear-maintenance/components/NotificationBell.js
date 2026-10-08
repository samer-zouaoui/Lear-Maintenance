'use client';

import { useEffect, useRef, useState } from 'react';
import { apiFetch, getCurrentUser } from '../lib/api';
import { getSocket } from '../lib/socket';
import { useToast } from './ToastProvider';
import PanneDetailModal from './PanneDetailModal';
import CloturerPanneModal from './CloturerPanneModal';

export default function NotificationBell() {
  const notify = useToast();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const wrapperRef = useRef(null);

  const currentUser = getCurrentUser();
  const isManager = currentUser?.role === 'ADMIN' || currentUser?.role === 'RESPONSABLE_MAINTENANCE';
  const isTechnicien = currentUser?.role === 'TECHNICIEN';

  // Panne affichée dans la modale de détails, ouverte depuis une notification.
  const [selectedPanne, setSelectedPanne] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Liste des techniciens, chargée seulement si l'utilisateur peut affecter.
  const [techniciens, setTechniciens] = useState([]);

  // Panne ciblée par la modale de clôture (technicien).
  const [closeTarget, setCloseTarget] = useState(null);

  async function load() {
    try {
      const data = await apiFetch('/notifications');
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      // Silencieux : on ne veut pas spammer de toast toutes les 30s si le réseau a un accroc.
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Connexion temps réel : dès qu'une notification est créée côté serveur (panne critique,
  // affectation, plan préventif...), elle arrive ici instantanément, sans avoir à recharger.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    function handleNewNotification(notification) {
      setNotifications((list) => [notification, ...list]);
      setUnreadCount((c) => c + 1);
    }

    socket.on('notification:new', handleNewNotification);
    return () => socket.off('notification:new', handleNewNotification);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleMarkAllRead() {
    try {
      await apiFetch('/notifications/lues/toutes', { method: 'PUT' });
      setNotifications((list) => list.map((n) => ({ ...n, lu: true })));
      setUnreadCount(0);
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  async function markRead(id) {
    try {
      await apiFetch(`/notifications/${id}/lue`, { method: 'PUT' });
      setNotifications((list) => list.map((n) => (n.idNotification === id ? { ...n, lu: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      // Silencieux : le clic doit quand même ouvrir la panne même si le "marquer comme lu" échoue.
    }
  }

  // Au clic sur une notification liée à une panne : on marque comme lue,
  // on ferme le dropdown et on ouvre directement les détails de la panne dans une modale,
  // avec les actions adaptées au rôle (affecter / prendre en charge / clôturer).
  async function handleNotificationClick(n) {
    if (!n.lu) markRead(n.idNotification);

    if (!n.panneId) {
      setOpen(false);
      return;
    }

    setOpen(false);
    setDetailLoading(true);
    try {
      const details = await apiFetch(`/pannes/${n.panneId}/details`);
      setSelectedPanne(details);

      if (isManager && techniciens.length === 0) {
        apiFetch('/auth')
          .then((users) => setTechniciens(users.filter((u) => u.role === 'TECHNICIEN')))
          .catch(() => {});
      }
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setDetailLoading(false);
    }
  }

  async function refreshSelectedPanne(panneId) {
    try {
      const details = await apiFetch(`/pannes/${panneId}/details`);
      setSelectedPanne(details);
    } catch (err) {
      // La panne a pu être clôturée/supprimée entre-temps : on ferme simplement.
      setSelectedPanne(null);
    }
  }

  async function handleAssign(panneId, technicienId) {
    try {
      await apiFetch(`/pannes/${panneId}`, {
        method: 'PUT',
        body: JSON.stringify({ technicienId, statutPanne: 'AFFECTE' }),
      });
      notify('Technicien affecté à la panne', 'success');
      await refreshSelectedPanne(panneId);
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  async function handlePrendreEnCharge(panneId) {
    try {
      await apiFetch(`/pannes/${panneId}`, {
        method: 'PUT',
        body: JSON.stringify({ statutPanne: 'EN_COURS' }),
      });
      notify('Panne prise en charge', 'success');
      await refreshSelectedPanne(panneId);
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  function handleCloturerClick(panne) {
    setSelectedPanne(null);
    setCloseTarget(panne);
  }

  return (
    <div className="notif-wrapper" ref={wrapperRef}>
      <button className="notif-bell" onClick={() => setOpen((o) => !o)} aria-label="Notifications">
        🔔
        {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-dropdown-header">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button className="btn btn-ghost" onClick={handleMarkAllRead} style={{ fontSize: 11.5, padding: '4px 8px' }}>
                Tout marquer lu
              </button>
            )}
          </div>

          <div className="notif-list">
            {loading ? (
              <div className="notif-empty">Chargement...</div>
            ) : notifications.length === 0 ? (
              <div className="notif-empty">Aucune notification pour le moment.</div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.idNotification}
                  className={`notif-item ${n.lu ? '' : 'notif-item-unread'}`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <div className="notif-item-title">{n.titre}</div>
                  <div className="notif-item-message">{n.message}</div>
                  <div className="notif-item-date">{new Date(n.dateCreation).toLocaleString('fr-FR')}</div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <PanneDetailModal
        panne={selectedPanne}
        loading={detailLoading}
        onClose={() => setSelectedPanne(null)}
        currentUser={currentUser}
        techniciens={techniciens}
        onAssign={isManager ? handleAssign : null}
        onPrendreEnCharge={isTechnicien ? handlePrendreEnCharge : null}
        onCloturerClick={isTechnicien ? handleCloturerClick : null}
      />

      {closeTarget && (
        <CloturerPanneModal
          panne={closeTarget}
          onClose={() => setCloseTarget(null)}
          onSuccess={() => {
            setCloseTarget(null);
            load();
          }}
        />
      )}
    </div>
  );
}