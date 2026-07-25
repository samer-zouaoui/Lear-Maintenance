import { io } from 'socket.io-client';
import { API_URL, getToken } from './api';

let socket = null;

// Connexion unique et partagée (singleton) au serveur Socket.IO, authentifiée avec le même JWT
// que les appels REST. Réutilisée par tous les composants qui ont besoin du temps réel
// (pour l'instant : la cloche de notifications).
export function getSocket() {
  const token = getToken();
  if (!token) return null;

  if (socket && socket.connected) return socket;

  if (!socket) {
    socket = io(API_URL, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
    });
  } else if (!socket.connected) {
    // Le token a pu changer (reconnexion/login) : on met à jour l'auth avant de reconnecter.
    socket.auth = { token };
    socket.connect();
  }

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}