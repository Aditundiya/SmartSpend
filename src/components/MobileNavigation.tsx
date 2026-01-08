'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  LayoutDashboard,
  ListChecks,
  DollarSign,
  Eye,
  Settings,
  Menu,
  Plus,
  PiggyBank,
  User,
  LogOut
} from 'lucide-react';
import { useProfile } from '@/contexts/ProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresProfile?: boolean;
}

const navItems: NavItem[] = [
  {
    href: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
    requiresProfile: true,
  },
  {
    href: '/transactions',
    label: 'Transactions',
    icon: ListChecks,
    requiresProfile: true,
  },
  {
    href: '/incomes',
    label: 'Incomes',
    icon: DollarSign,
    requiresProfile: true,
  },
  {
    href: '/overview',
    label: 'Overview',
    icon: Eye,
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: Settings,
    requiresProfile: true,
  },
];

export default function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { currentProfile, loading: profileLoading } = useProfile();
  const { logout } = useAuth();

  const handleNavClick = () => {
    setIsOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden bg-card border-b border-border sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <PiggyBank className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">SmartSpend</span>
          </Link>

          <div className="flex items-center gap-2">
            {/* Quick Add Button */}
            {currentProfile && !profileLoading && (
              <Button size="sm" asChild>
                <Link href="/#quick-add">
                  <Plus className="h-4 w-4" />
                </Link>
              </Button>
            )}

            {/* Menu Button */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" aria-label="Open navigation menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader className="sr-only">
                  <SheetTitle>Navigation Menu</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col h-full">
                  {/* Header */}
                  <div className="flex items-center gap-2 pb-4 border-b">
                    <PiggyBank className="h-6 w-6 text-primary" />
                    <span className="font-bold text-lg">SmartSpend</span>
                  </div>

                  {/* Profile Info */}
                  {currentProfile && !profileLoading && (
                    <div className="py-4 border-b">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{currentProfile.name}</p>
                          <p className="text-sm text-muted-foreground">Active Profile</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Navigation Items */}
                  <nav className="flex-1 py-4">
                    <div className="space-y-1">
                      {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        const isDisabled = item.requiresProfile && (!currentProfile || profileLoading);

                        if (isDisabled) return null;

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={handleNavClick}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                              isActive
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent"
                            )}
                          >
                            <Icon className="h-4 w-4" />
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  </nav>

                  {/* Footer Actions */}
                  <div className="border-t pt-4">
                    <Button
                      variant="ghost"
                      onClick={handleLogout}
                      className="w-full justify-start text-muted-foreground hover:text-foreground"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Logout
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Bottom Navigation for Mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40" aria-label="Main navigation">
        <div className="flex items-center justify-around py-2">
          {navItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const isDisabled = item.requiresProfile && (!currentProfile || profileLoading);

            if (isDisabled) return <div key={item.href} className="w-12" />; // Placeholder

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-0",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium truncate">{item.label}</span>
              </Link>
            );
          })}

          {/* Settings in bottom nav */}
          {currentProfile && !profileLoading && (
            <Link
              href="/settings"
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-0",
                pathname === '/settings'
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Settings className="h-5 w-5" />
              <span className="text-xs font-medium">Settings</span>
            </Link>
          )}
        </div>
      </nav>
    </>
  );
}