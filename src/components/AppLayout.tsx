import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-[100svh] flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-40 h-14 border-b border-border bg-card flex items-center px-4 pt-[env(safe-area-inset-top)]">
            <SidebarTrigger />
          </header>
          <main className="flex-1 p-6 bg-background overflow-y-auto overscroll-y-contain pb-[calc(1.5rem+env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch]">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
