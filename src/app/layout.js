import { Inter } from 'next/font/google'
import "./globals.css"

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

export const metadata = {
  title: "Memorial App",
  description: "Crea árboles conmemorativos para tus seres queridos.",
}

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={inter.className}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}