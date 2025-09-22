'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { path: '/dashboard/game', label: 'Home' },
    { path: '/dashboard/leaderboard', label: 'Leaderboard' },
    { path: '/dashboard/history', label: 'History' },
    { path: '/dashboard/profile', label: 'Me' },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Token Display */}
      <div className="w-full py-2 px-4 text-right">
        <span className="inline-block rounded-full bg-gray-100 px-4 py-1">
          250 $TOKENS
        </span>
      </div>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="border-t border-gray-200">
        <div className="max-w-md mx-auto px-4">
          <div className="flex justify-around py-3">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`flex flex-col items-center ${
                  pathname === item.path
                    ? 'text-blue-500'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {/* You can add icons here later */}
                <span className="text-xs">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
} 