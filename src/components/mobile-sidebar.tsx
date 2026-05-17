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
          className="w-72 border-slate-700 bg-slate-800 p-0 text-slate-200"
        >
          <SheetHeader className="flex h-16 flex-row items-center px-5 space-y-0">
            <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
            <BrandLogo size="sm" onDark />
          </SheetHeader>
          <SidebarNav role={role} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
