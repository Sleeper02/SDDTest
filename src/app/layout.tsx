import type { Metadata } from 'next';
import React from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'SDD RSS Feed Reader — Local-First',
  description:
    'Leitor de feeds RSS 2.0 e Atom 1.0 com ordenação cronológica e persistência local no dispositivo.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
