'use client';

import React, { useState } from 'react';
import './globals.css';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { JarvisDrawer } from '@/components/ai/jarvis-drawer';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isJarvisOpen, setIsJarvisOpen] = useState(false);

  return (
    <html lang="en" className="dark">
      <head>
        <title>Grabber Business OS — Single-Business Commerce Platform</title>
        <meta name="description" content="Single-Business Commerce Engine + POS + Store + WhatsApp + Physical Operations + Polim Potha + Jarvis AI" />
      </head>
      <body className="min-h-screen bg-background text-foreground flex">
        {/* Navigation Sidebar */}
        <Sidebar />

        {/* Main Application Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-screen">
          <Header onToggleJarvis={() => setIsJarvisOpen(!isJarvisOpen)} />
          <main className="flex-1 p-6 overflow-y-auto max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>

        {/* Jarvis Copilot Drawer */}
        <JarvisDrawer isOpen={isJarvisOpen} onClose={() => setIsJarvisOpen(false)} />
      </body>
    </html>
  );
}
