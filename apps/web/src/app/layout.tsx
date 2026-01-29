import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ProRoom - Secure Communication',
  description: 'End-to-end encrypted team communication platform',
};

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen">{children}</body>
    </html>
  );
};

export default RootLayout;
