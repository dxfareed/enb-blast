import type { Metadata, Viewport } from "next";
import { minikitConfig } from "@/minikit.config";
import { RootProvider } from "./rootProvider";
import { Space_Mono } from 'next/font/google';
import "./globals.css";
//import { ErudaLoader } from "./components/ErudaLoader";
import { Analytics } from "@vercel/analytics/next"; // Import Analytics

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-space-mono',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
  viewportFit: 'cover',
}

export async function generateMetadata(): Promise<Metadata> {
  
  return {
    title: minikitConfig.frame.name,
    description: minikitConfig.frame.description,
    other: {
      "fc:frame": JSON.stringify({
        version: minikitConfig.frame.version,
        imageUrl: minikitConfig.frame.heroImageUrl,
        button: {
          title: `Launch ENB Blast`,
          action: {
            name: `Launch ${minikitConfig.frame.name}`,
            type: "launch_frame",
          },
        },
      }),
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <html lang="en" className={spaceMono.variable}>
      <body>
        <RootProvider>{children}</RootProvider>
        <Analytics />
      </body>
    </html>
  );
}
