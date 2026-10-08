'use client';

import { useTheme } from './ThemeProvider';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle"
      title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      aria-label="Changer de thème"
    >
      <span className="theme-toggle-icon">{isDark ? '☀️' : '🌙'}</span>
      <span>{isDark ? 'Mode clair' : 'Mode sombre'}</span>
    </button>
  );
}
