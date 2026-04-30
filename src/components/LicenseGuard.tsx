'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { licenseAPI } from '@/lib/electron-api';

export default function LicenseGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkLicense = async () => {
      try {
        const data = await licenseAPI.check();
        const isValid = data.success && data.valid;

        if (!isValid && pathname !== '/license') {
          router.replace('/license');
        } else if (isValid && pathname === '/license') {
          router.replace('/scan');
          setAuthorized(true);
        } else {
          setAuthorized(true);
        }
      } catch (error) {
        console.error('License check failed', error);
        // On error, fail safe to blocking if we want to be strict, or allow if we want to be lenient.
        // For security, strict is better, redirect to license page to try again.
        if (pathname !== '/license') {
          router.replace('/license');
        } else {
          setAuthorized(true);
        }
      } finally {
        setChecking(false);
      }
    };

    checkLicense();
  }, [pathname, router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-slate-400 dark:text-slate-500 animate-spin" />
      </div>
    );
  }

  // If we're on the license page, we always render children (which is the license page content)
  // If we're authorized, we render children
  // Otherwise, we render nothing while redirecting
  if (pathname === '/license' || authorized) {
    return <>{children}</>;
  }

  return null;
}
