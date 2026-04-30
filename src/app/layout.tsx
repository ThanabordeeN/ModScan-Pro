import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ModbusProvider } from "@/context/ModbusContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { ProjectProvider } from "@/context/ProjectContext";
import { ThemeProvider } from "@/context/ThemeContext";
import Navigation from "@/components/Navigation";
import LicenseGuard from "@/components/LicenseGuard";
import RemoteGuard from "@/components/RemoteGuard";
import UpdateNotification from "@/components/UpdateNotification";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "ModScan Pro - Address Scanner & Configuration Tool",
  description: "Scan Modbus RTU devices and change their addresses",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className={`${inter.variable} font-sans antialiased min-h-screen bg-slate-50 dark:bg-slate-900`}>
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
                        <footer className="border-t border-gray-200 dark:border-slate-700 mt-auto bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
                          <div className="max-w-5xl mx-auto px-4 py-6">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <img src="/logo.svg" alt="Logo" className="w-6 h-6 opacity-50" />
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">ModScan Pro</span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                © {new Date().getFullYear()} 2EDGE Technology Co.,Ltd. All rights reserved.
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
