import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export const metadata: Metadata = {
  title: "CAPRI CASINO — Casino online play money · Juega gratis",
  description:
    "La experiencia de casino premium con dinero 100% ficticio. Juegos originals provably fair, slots y crash. 100.000 FUN de bienvenida. Sin riesgo real, +18.",
  // Nota: sin meta de Twitter Cards por decisión del propietario.
  openGraph: {
    title: "CAPRI CASINO",
    description: "El lujo de Capri, la emoción del casino. 100% play money.",
    type: "website",
    locale: "es_ES",
  },
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
