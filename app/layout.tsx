/**
 * Root app layout: wraps every page (login and /admin/*).
 * - Provides fonts (Geist), theme script (Flowbite dark), and global styles.
 * - Renders ConditionalNavbar (hidden on login) and scrollable content area.
 * - SidebarProvider enables sidebar open/close state for admin routes.
 * - Toaster configures react-hot-toast defaults (position, duration, success/error icons).
 */
import ConditionalNavbar from "@/components/layout/ConditionalNavbar";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { GalleryDownloadProvider } from "@/contexts/GalleryDownloadContext";
import { GalleryUploadProvider } from "@/contexts/GalleryUploadContext";
import { ThemeModeScript } from "flowbite-react";
import type { Metadata } from "next";
import { geistSans, geistMono } from "@/utils/fonts";
import "./globals.css";
import { AppToaster } from "@/components/ui/AppToaster";

export const metadata: Metadata = {
  title: "Jarvis Admin App",
  description: "",
  icons: { icon: "/favicon.ico" },
};

export default async function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeModeScript />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} h-screen w-full overflow-hidden bg-zinc-50 text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100`}
        suppressHydrationWarning
      >
        <SidebarProvider>
          <GalleryDownloadProvider>
            <GalleryUploadProvider>
              <div className="flex h-full w-full flex-col">
                <ConditionalNavbar />
                <div className="flex-1 overflow-hidden">{children}</div>
              </div>
            </GalleryUploadProvider>
          </GalleryDownloadProvider>
        </SidebarProvider>
        <AppToaster />
      </body>
    </html>
  );
}
