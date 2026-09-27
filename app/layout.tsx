import type { Metadata, Viewport } from "next";
import { PWARegister } from "@/components/PWARegister";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "OTLA · Mi espacio de trabajo",
    template: "%s · OTLA",
  },
  applicationName: "OTLA",
  description: "Contactos, proyectos, agenda y pagos en un solo lugar.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "OTLA",
  },
  icons: {
    icon: [
      { url: "/otla-app-icon-v2.png", sizes: "1254x1254", type: "image/png" },
    ],
    apple: [
      { url: "/otla-app-icon-v2.png", sizes: "1254x1254", type: "image/png" },
    ],
  },
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1a1a1a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className="h-full antialiased"
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1a1a1a" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <PWARegister />
        {children}
        <Toaster richColors closeButton position="top-right" />
      </body>
    </html>
  );
}
