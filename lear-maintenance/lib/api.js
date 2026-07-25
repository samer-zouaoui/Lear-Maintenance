// URL de ton backend Express (Module Machines/Auth/Pannes/Interventions)
export const API_URL = 'http://localhost:3000';

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('lear_token');
}

export function setToken(token) {
  localStorage.setItem('lear_token', token);
}

export function clearToken() {
  localStorage.removeItem('lear_token');
}

export function isLoggedIn() {
  return !!getToken();
}



export function getCurrentUser() {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload; // { idUser, role, iat, exp }
  } catch {
    return null;
  }
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error((data && data.error) || `Erreur ${res.status}`);
  }

  return data;
}

// Pour l'upload de fichiers (FormData) : on NE fixe PAS Content-Type,
// le navigateur le fait tout seul avec le bon boundary multipart.
export async function apiUpload(path, formData) {
  const token = getToken();
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error((data && data.error) || `Erreur ${res.status}`);
  }

  return data;
}