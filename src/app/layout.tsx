import type { Metadata } from "next";
import {
  IBM_Plex_Sans_Thai,
  IBM_Plex_Sans,
  IBM_Plex_Mono,
} from "next/font/google";
import "./globals.css";
import { ModbusProvider } from "@/context/ModbusContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { ProjectProvider } from "@/context/ProjectContext";
import { ThemeProvider } from "@/context/ThemeContext";
import Navigation from "@/components/Navigation";
import LicenseGuard from "@/components/LicenseGuard";
import RemoteGuard from "@/components/RemoteGuard";
import UpdateNotification from "@/components/UpdateNotification";

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-ibm-plex-sans-thai",
});

const ibmPlexSans = IBM_Plex_Sans({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-ibm-plex-sans",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
});

export const metadata: Metadata = {
  title: "ModScan Pro Community - Address Scanner & Configuration Tool",
  description: "Scan Modbus RTU devices and change their addresses",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body
        className={`${ibmPlexSansThai.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} font-sans antialiased min-h-screen bg-app-bg text-app-text`}
      >
        <ThemeProvider>
          <ModbusProvider>
            <LanguageProvider>
              <ProjectProvider>
                <LicenseGuard>
                  <RemoteGuard>
                    <div className="flex min-h-screen">
                      <Navigation />
                      <div className="flex-1 flex flex-col min-w-0">
                        {/* Mobile spacer for top bar */}
                        <div className="lg:hidden h-14" />
                        <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
                          {children}
                        </main>
                        <UpdateNotification />
                        <footer className="border-t border-app-border mt-auto bg-app-surface backdrop-blur-sm">
                          <div className="max-w-5xl mx-auto px-4 py-6">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <img
                                  src="/logo.png"
                                  alt="Logo"
                                  className="w-6 h-6 opacity-50"
                                />
                                <span className="text-sm font-bold text-app-text">
                                  ModScan Pro Community
                                </span>
                              </div>
                              <p className="text-xs text-app-muted text-center md:text-right">
                                Open Source Edition <br className="md:hidden" />
                                © {new Date().getFullYear()} 2edge.co
                              </p>
                            </div>
                          </div>
                        </footer>
                      </div>
                    </div>
                  </RemoteGuard>
                </LicenseGuard>
              </ProjectProvider>
            </LanguageProvider>
          </ModbusProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
