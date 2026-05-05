import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'WalletIQ — Saúde Financeira',
  description: 'Monitore seu fluxo financeiro em tempo real. Open Finance, IA e ticker por minuto.',
  keywords: ['finanças pessoais', 'open finance', 'controle financeiro', 'saúde financeira'],
  openGraph: {
    title: 'WalletIQ — Saúde Financeira',
    description: 'Veja quanto você ganha e gasta por minuto.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
        <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/>
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
