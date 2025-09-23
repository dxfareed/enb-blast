import type { Metadata } from "next";
import { minikitConfig } from "@/minikit.config";
import { RootProvider } from "./rootProvider";
import { Space_Mono } from 'next/font/google';
import "./globals.css";

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'], // Regular and Bold
  style: ['normal', 'italic'],
  variable: '--font-space-mono', // 3. Create a CSS variable for it
});



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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RootProvider>
      <html lang="en" className={spaceMono.variable}>
        <body>
          {children}
        </body>
      </html>
    </RootProvider>
  );
}
