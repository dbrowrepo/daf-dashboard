import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DAF Externe - Dashboard',
  description: 'Tableau de bord financier pour dirigeants de TPE',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="bg-background text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
