import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Platform Educativa',
  description: 'Plataforma educativa online - Reemplazo de Moodle',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="bg-gray-50">
        {children}
      </body>
    </html>
  )
}
