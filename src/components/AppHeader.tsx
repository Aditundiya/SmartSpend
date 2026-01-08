
'use client';

import Link from 'next/link';
import { PiggyBank, LayoutDashboard, ListChecks, Settings, Users, User, DollarSign, Eye, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/contexts/ProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AppHeader() {
  const { currentProfile, setCurrentProfileById, profiles, loading: profileLoading } = useProfile();
  const { isLoggedIn, logout, isLoading: authLoading } = useAuth();

  return (
    <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
          <PiggyBank className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold font-headline">SmartSpend</h1>
        </Link>

        {isLoggedIn && (
          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-1 md:gap-2">
              {currentProfile && !profileLoading && (
                <>
                  <Button variant="ghost" asChild>
                    <Link href="/" className="flex items-center gap-2">
                      <LayoutDashboard className="h-5 w-5" />
                      Dashboard
                    </Link>
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link href="/transactions" className="flex items-center gap-2">
                      <ListChecks className="h-5 w-5" />
                      Transactions
                    </Link>
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link href="/incomes" className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Incomes
                    </Link>
                  </Button>
                </>
              )}

              {profiles.length > 0 && (
                <Button variant="ghost" asChild>
                  <Link href="/overview" className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Overview
                  </Link>
                </Button>
              )}

              {currentProfile && !profileLoading && (
                <Button variant="ghost" asChild>
                  <Link href="/settings" className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Settings
                  </Link>
                </Button>
              )}
            </nav>

            {profiles.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-40 md:w-48 justify-start">
                    {profileLoading || authLoading ? (
                      <Users className="mr-2 h-5 w-5" />
                    ) : currentProfile ? (
                      <User className="mr-2 h-5 w-5" />
                    ) : (
                      <Users className="mr-2 h-5 w-5" />
                    )}
                    {profileLoading || authLoading ? "Loading..." : currentProfile ? currentProfile.name : "Select Profile"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48">
                  <DropdownMenuLabel>Switch Profile</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup
                    value={currentProfile?.id || ""}
                    onValueChange={(value) => {
                      if (value) setCurrentProfileById(value);
                    }}
                  >
                    {profiles.map((profile) => (
                      <DropdownMenuRadioItem key={profile.id} value={profile.id}>
                        {profile.name}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
