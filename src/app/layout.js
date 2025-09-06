import { Geist_Sans } from "next/font/google"
import "./globals.css"

const geistSans = Geist_Sans({
  subsets: ["latin"],
  variable: "--font-geist-sans",
})

export const metadata = {
  title: "Memorial App",
  description: "Crea árboles conmemorativos para tus seres queridos.",
}

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${geistSans.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}