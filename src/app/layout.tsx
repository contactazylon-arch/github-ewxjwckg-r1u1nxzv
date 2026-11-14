import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BotNexus — The Discord Bot Ecosystem',
  description: 'Découvrez, gérez et créez votre écosystème de bots Discord.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body>{children}</body></html>;
}
