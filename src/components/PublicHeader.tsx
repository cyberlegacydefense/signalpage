'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui';

interface PublicHeaderProps {
  showNavLinks?: boolean;
}

export function PublicHeader({ showNavLinks = true }: PublicHeaderProps) {
  const [user, setUser] = useState<{ firstName: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (authUser) {
        // Get user's first name from profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', authUser.id)
          .single();

        const fullName = profile?.full_name || authUser.email || '';
        const firstName = fullName.split(' ')[0];
        setUser({ firstName });
      }
      setIsLoading(false);
    }

    checkAuth();
  }, []);

  return (
    <nav className="border-b border-gray-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 sm:h-20 items-center justify-between">
          <Link href="/" className="flex-shrink-0">
            <Image
              src="/signalpage-logo.png"
              alt="SignalPage"
              width={822}
              height={234}
              className="h-8 sm:h-10 md:h-12 w-auto"
              priority
            />
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            {showNavLinks && (
              <>
                <Link href="/faq" className="hidden sm:inline text-sm font-medium text-gray-900 hover:text-gray-600">
                  How It Works
                </Link>
                <Link href="/pricing" className="hidden sm:inline text-sm font-medium text-gray-900 hover:text-gray-600">
                  Pricing
                </Link>
              </>
            )}
            {isLoading ? (
              <div className="h-9 w-20 animate-pulse rounded-md bg-gray-100" />
            ) : user ? (
              <Link href="/dashboard">
                <Button variant="primary" className="text-xs sm:text-sm px-2 sm:px-4">
                  {user.firstName}
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/auth/login">
                  <Button variant="ghost" className="text-xs sm:text-sm px-2 sm:px-4">Sign in</Button>
                </Link>
                <Link href="/auth/signup">
                  <Button variant="primary" className="text-xs sm:text-sm px-2 sm:px-4">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
        {/* Mobile links */}
        {showNavLinks && (
          <div className="flex sm:hidden justify-center gap-4 pb-3">
            <Link href="/faq" className="text-sm font-medium text-gray-900 hover:text-gray-600">
              How It Works
            </Link>
            <Link href="/pricing" className="text-sm font-medium text-gray-900 hover:text-gray-600">
              Pricing
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
