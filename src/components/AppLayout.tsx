import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { MobileHeader, MobileBottomNav } from './MobileNav';

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-[100svh] flex w-full">
        {/* Desktop/Tablet Sidebar */}
        <div className="hidden md:block">
          <AppSidebar />
        </div>
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Desktop Header */}
          <header className="hidden md:flex sticky top-0 z-40 h-14 border-b border-border bg-card items-center px-4 pt-[env(safe-area-inset-top)]">
            <SidebarTrigger />
          </header>
          
          {/* Mobile Header */}
          <MobileHeader />
          
          {/* Main Content - pb-20 for mobile bottom nav */}
          <main className="flex-1 p-4 md:p-6 bg-background overflow-y-auto overscroll-y-contain pb-24 md:pb-[calc(1.5rem+env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch]">
            {children}
          </main>
        </div>
        
        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </div>
    </SidebarProvider>
  );
}
