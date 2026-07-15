import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export const metadata: Metadata = {
  title: "CAPRI CASINO — Acceso privado",
  description: "Acceso exclusivo para clientes de CAPRI CASINO.",
  robots: { index: false, follow: false }, // web privada: no se indexa
  // Nota: sin meta de Twitter Cards por decisión del propietario.
};

export const viewport: Viewport = {
  themeColor: "#080b14",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${playfair.variable}`}>
      <body>{children}</body>
    </html>
  );
}
