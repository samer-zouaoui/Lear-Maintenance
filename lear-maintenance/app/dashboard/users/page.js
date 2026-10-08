'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch, getCurrentUser } from '../../../lib/api';
import { useToast } from '../../../components/ToastProvider';
import ConfirmModal from '../../../components/ConfirmModal';
import { SkeletonTable } from '../../../components/Skeleton';

const ROLES = ['ADMIN', 'RESPONSABLE_MAINTENANCE', 'TECHNICIEN', 'DEMANDEUR'];

const ROLE_BADGE = {
  ADMIN: 'badge-danger',
  RESPONSABLE_MAINTENANCE: 'badge-warning',
  TECHNICIEN: 'badge-info',
  DEMANDEUR: 'badge-neutral',
};

const STATUT_OPTIONS = [
  { value: 'actifs', label: 'Comptes actifs' },
  { value: 'inactifs', label: 'Comptes désactivés' },
  { value: 'tous', label: 'Tous' },
];

export default function UsersPage() {
  const notify = useToast();
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statutFilter, setStatutFilter] = useState('actifs');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [reactivatingId, setReactivatingId] = useState(null);

  async function loadUsers() {
    setLoading(true);
    try {
      const data = await apiFetch(`/auth?statut=${statutFilter}`);
      setUsers(data);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statutFilter]);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  if (currentUser !== null && currentUser?.role !== 'ADMIN') {
    return (
      <div className="panel">
        <div className="panel-title">Accès restreint</div>
        <p style={{ color: '#767981', fontSize: 14 }}>
          Cette section est réservée aux administrateurs.
        </p>
      </div>
    );
  }

  const usersFiltres = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter && u.role !== roleFilter) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return u.nomUser.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    });
  }, [users, search, roleFilter]);

  async function handleRoleChange(idUser, role) {
    try {
      await apiFetch(`/auth/${idUser}`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      });
      notify('Rôle mis à jour', 'success');
      await loadUsers();
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  function requestDeactivate(user) {
    setPendingDelete(user);
  }

  async function confirmDeactivate() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await apiFetch(`/auth/${pendingDelete.idUser}`, { method: 'DELETE' });
      notify('Compte désactivé', 'success');
      setPendingDelete(null);
      await loadUsers();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  }

  async function handleReactivate(user) {
    setReactivatingId(user.idUser);
    try {
      await apiFetch(`/auth/${user.idUser}/reactiver`, { method: 'PUT' });
      notify('Compte réactivé', 'success');
      await loadUsers();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setReactivatingId(null);
    }
  }

  return (
    <>
      <div className="panel">
        <div className="panel-title">Utilisateurs ({usersFiltres.length}{usersFiltres.length !== users.length ? ` / ${users.length}` : ''})</div>

        <div className="table-toolbar">
          <input
            type="search"
            placeholder="Rechercher (nom, email...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">Tous les rôles</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={statutFilter} onChange={(e) => setStatutFilter(e.target.value)}>
            {STATUT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Email</th>
              <th>Rôle actuel</th>
              <th>Changer le rôle</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTable rows={5} columns={6} />
            ) : usersFiltres.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-row">
                  {users.length === 0 ? 'Aucun utilisateur pour l\u2019instant.' : 'Aucun utilisateur ne correspond à ta recherche.'}
                </td>
              </tr>
            ) : (
              usersFiltres.map((u) => (
                <tr key={u.idUser}>
                  <td>{u.nomUser}</td>
                  <td>{u.email}</td>
                  <td><span className={`badge ${ROLE_BADGE[u.role] || 'badge-neutral'}`}>{u.role}</span></td>
                  <td>
                    <select
                      defaultValue={u.role}
                      onChange={(e) => handleRoleChange(u.idUser, e.target.value)}
                      disabled={!u.actif}
                      style={{ fontSize: 12.5, padding: '6px 8px' }}
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td>
                    <span className={`badge ${u.actif ? 'badge-success' : 'badge-neutral'}`}>
                      {u.actif ? 'Actif' : 'Désactivé'}
                    </span>
                  </td>
                  <td>
                    {u.actif ? (
                      <button className="btn btn-ghost" onClick={() => requestDeactivate(u)}>Désactiver</button>
                    ) : (
                      <button
                        className="btn btn-secondary"
                        disabled={reactivatingId === u.idUser}
                        onClick={() => handleReactivate(u)}
                      >
                        {reactivatingId === u.idUser ? 'Réactivation...' : 'Réactiver'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={!!pendingDelete}
        title="Désactiver ce compte ?"
        message={
          pendingDelete
            ? `Le compte de "${pendingDelete.nomUser}" (${pendingDelete.email}) sera désactivé : il ne pourra plus se connecter, et n'apparaîtra plus dans les listes d'affectation. Son historique (interventions, maintenances réalisées) reste conservé. Tu pourras le réactiver à tout moment.`
            : ''
        }
        confirmLabel="Désactiver"
        loadingLabel="Désactivation..."
        loading={deleting}
        onConfirm={confirmDeactivate}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}