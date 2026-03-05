import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ModbusProvider } from "@/context/ModbusContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { ProjectProvider } from "@/context/ProjectContext";
import Navigation from "@/components/Navigation";
import LicenseGuard from "@/components/LicenseGuard";
import RemoteGuard from "@/components/RemoteGuard";

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
      <body className={`${inter.variable} font-sans antialiased min-h-screen bg-slate-50`}>
        <ModbusProvider>
          <LanguageProvider>
            <ProjectProvider>
              <LicenseGuard>
                <RemoteGuard>
                  <Navigation />
                  <main className="max-w-5xl mx-auto px-4 py-8">
                    {children}
                  </main>
                  <footer className="border-t border-gray-200 mt-auto bg-white/50 backdrop-blur-sm">
                    <div className="max-w-5xl mx-auto px-4 py-6">
                      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <img src="/logo.svg" alt="Logo" className="w-6 h-6 opacity-50" />
                          <span className="text-sm font-bold text-slate-700">ModScan Pro</span>
                        </div>
                        <p className="text-xs text-slate-500">
                          © {new Date().getFullYear()} 2EDGE Technology Co.,Ltd. All rights reserved.
                        </p>
                      </div>
                    </div>
                  </footer>
                </RemoteGuard>
              </LicenseGuard>
            </ProjectProvider>
          </LanguageProvider>
        </ModbusProvider>
      </body>
    </html>
  );
}
