function initialsFrom(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export default function UserAvatar({ name, size = 36 }) {
  return (
    <div
      className="user-avatar"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      title={name || 'Utilisateur'}
    >
      {initialsFrom(name)}
    </div>
  );
}
