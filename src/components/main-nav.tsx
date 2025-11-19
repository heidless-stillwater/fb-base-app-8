'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ListChecks, LogOut } from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useAuth, useUser } from '@/firebase';

export default function MainNav() {
  const pathname = usePathname();
  const auth = useAuth();
  const { user } = useUser();

  if (!user) {
    return null;
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2">
            <SidebarTrigger />
            <h1 className="font-semibold text-lg">My App</h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/">
              <SidebarMenuButton isActive={pathname === '/'} tooltip="Home">
                <Home />
                <span>Home</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/todo">
              <SidebarMenuButton isActive={pathname === '/todo'} tooltip="Todo">
                <ListChecks />
                <span>Todo</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <Button variant="ghost" onClick={() => auth.signOut()}>
            <LogOut />
            <span>Sign Out</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
