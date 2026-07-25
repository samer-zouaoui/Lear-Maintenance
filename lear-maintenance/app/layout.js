import './globals.css';
import { ToastProvider } from '../components/ToastProvider';
import { ThemeProvider } from '../components/ThemeProvider';

export const metadata = {
  title: 'Lear | Maintenance Industrielle',
  description: 'Application de gestion de maintenance industrielle - Lear Corporation',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
