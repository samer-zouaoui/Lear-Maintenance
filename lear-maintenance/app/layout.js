import './globals.css';
import { ToastProvider } from '../components/ToastProvider';
import { ThemeProvider } from '../components/ThemeProvider';
import PwaRegister from '../components/PwaRegister';

export const metadata = {
  title: 'Lear | Maintenance Industrielle',
  description: 'Application de gestion de maintenance industrielle - Lear Corporation',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Lear Maintenance',
  },
};

export const viewport = {
  themeColor: '#C8102E',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
        <PwaRegister />
      </body>
    </html>
  );
}