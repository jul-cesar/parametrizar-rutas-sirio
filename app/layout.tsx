import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Parametrizar Rutas MFE",
  description: "Administra el mapeo de rutas de microfrontends",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}