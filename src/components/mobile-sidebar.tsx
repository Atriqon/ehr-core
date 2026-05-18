'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { SidebarNav } from '@/components/sidebar-nav';
import { BrandLogo } from '@/components/brand-logo';
import type { UserRole } from '@/lib/db/schema';

interface MobileSidebarProps {
  role: UserRole;
  children: React.ReactNode;
}

export function MobileSidebar({ role, children }: MobileSidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <span onClick={() => setOpen(true)}>{children}</span>
      <Sheet open={open} onOpenChange={(value) => setOpen(value)}>
        <SheetContent
          side="left"
          className="w-72 border-slate-900/6 bg-white/80 p-0 text-slate-700 backdrop-blur-2xl"
        >
          <SheetHeader className="flex h-16 flex-row items-center border-b border-slate-900/6 px-5 space-y-0">
            <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
            <BrandLogo size="sm" />
          </SheetHeader>
          <SidebarNav role={role} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
