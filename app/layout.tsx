import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "Bürgin Ranch Spesen",
  description: "Spesenverwaltung für die Bürgin Ranch",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={manrope.variable}>
      <body className="font-[family-name:var(--font-manrope)] antialiased bg-slate-50">
        {children}
      </body>
    </html>
  );
}