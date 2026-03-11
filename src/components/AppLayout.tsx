import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { MobileHeader, MobileBottomNav } from './MobileNav';
import { ImpersonationBanner } from './ImpersonationBanner';
import { useIsMobile } from '@/hooks/use-mobile';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();

  // Mobile: no sidebar at all, just header + bottom nav
  if (isMobile) {
    return (
      <div className="h-screen overflow-hidden flex flex-col w-full bg-background">
        <ImpersonationBanner />
        <MobileHeader />
        <main className="h-full flex-1 min-h-0 w-full px-4 py-4 pb-24 bg-background overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
          {children}
        </main>
        <MobileBottomNav />
      </div>
    );
  }

  // Desktop/Tablet: sidebar layout
  return (
    <SidebarProvider className="h-full overflow-hidden">
      <div className="h-screen overflow-hidden flex flex-col w-full">
        <ImpersonationBanner />
        <div className="flex flex-1 min-h-0">
          <AppSidebar />
          <div className="flex-1 h-full min-h-0 flex flex-col min-w-0">
            <header className="sticky top-0 z-40 h-14 shrink-0 border-b border-border bg-card flex items-center px-4">
              <SidebarTrigger />
            </header>
            <main className="h-full flex-1 min-h-0 p-6 bg-background overflow-y-auto overscroll-y-contain pb-[calc(1.5rem+env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch]">
              {children}
            </main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
