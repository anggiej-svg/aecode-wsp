import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AECODE — Grupo WhatsApp',
  description: 'Únete al grupo de WhatsApp de AECODE',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
