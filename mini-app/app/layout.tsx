import type { Metadata } from "next";
import { minikitConfig } from "@/minikit.config";
import { RootProvider } from "./rootProvider";

import "./globals.css";
import { Space_Mono } from 'next/font/google';



export async function generateMetadata(): Promise<Metadata> {
  
  return {
    title: minikitConfig.frame.name,
    description: minikitConfig.frame.description,
    other: {
      "fc:frame": JSON.stringify({
        version: minikitConfig.frame.version,
        imageUrl: minikitConfig.frame.heroImageUrl,
        button: {
          title: `Launch ${minikitConfig.frame.name}`,
          action: {
            name: `Launch ${minikitConfig.frame.name}`,
            type: "launch_frame",
          },
        },
      }),
    },
  };
}

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: "--font-space-mono",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RootProvider>
      <html lang="en" >
        <body className={spaceMono.variable}>
          {children}
        </body>
      </html>
    </RootProvider>
  );
}
