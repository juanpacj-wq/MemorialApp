import { GeistSans } from "geist/font/sans";
import "./globals.css";

export const metadata = {
  title: "Memorial App",
  description: "Crea árboles conmemorativos para tus seres queridos.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={GeistSans.className}>
      <body>{children}</body>
    </html>
  );
}