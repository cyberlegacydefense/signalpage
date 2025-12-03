import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering - don't try to prerender at build time
export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Desktop Navigation */}
          <div className="flex h-16 sm:h-20 items-center justify-between">
            <div className="flex items-center">
              <Link href="/dashboard" className="flex-shrink-0">
                <Image
                  src="/signalpage-logo.png"
                  alt="SignalPage"
                  width={822}
                  height={234}
                  className="h-8 sm:h-10 md:h-12 w-auto"
                  priority
                />
              </Link>
              {/* Desktop nav links */}
              <div className="hidden sm:ml-8 sm:flex sm:items-center sm:space-x-2 md:space-x-4">
                <Link
                  href="/dashboard"
                  className="rounded-md px-2 md:px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100"
                >
                  My Pages
                </Link>
                <Link
                  href="/dashboard/new"
                  className="rounded-md px-2 md:px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100"
                >
                  New Page
                </Link>
                <Link
                  href="/dashboard/profile"
                  className="rounded-md px-2 md:px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100"
                >
                  Profile
                </Link>
                <Link
                  href="/pricing"
                  className="rounded-md px-2 md:px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100"
                >
                  Pricing
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <span className="hidden md:inline text-sm font-medium text-gray-900">
                {profile?.full_name || user.email}
              </span>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="rounded-md px-2 sm:px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
          {/* Mobile nav links */}
          <div className="flex sm:hidden items-center justify-center space-x-4 pb-3 border-t border-gray-100 pt-2">
            <Link
              href="/dashboard"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-gray-100"
            >
              My Pages
            </Link>
            <Link
              href="/dashboard/new"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-gray-100"
            >
              New Page
            </Link>
            <Link
              href="/dashboard/profile"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-gray-100"
            >
              Profile
            </Link>
            <Link
              href="/pricing"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-gray-100"
            >
              Pricing
            </Link>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
