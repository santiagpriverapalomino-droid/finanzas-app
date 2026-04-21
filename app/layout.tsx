import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Finti — Tu gestor financiero inteligente',
  description: 'Controla tus gastos y ahorra más con IA',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
  <script dangerouslySetInnerHTML={{__html: `
    document.documentElement.classList.remove('dark');
  `}}/>
  <link rel="manifest" href="/manifest.json" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4C1D95" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Finti" />
      </head>
      <body className={inter.className}>
        {children}
        <script dangerouslySetInnerHTML={{__html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js')
            })
          }
        `}}/>
      </body>
    </html>
  )
}