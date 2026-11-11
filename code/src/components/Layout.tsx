import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import AppSidebar from '@/components/AppSidebar';

export function Layout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col min-w-0 overflow-x-hidden">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border/30 bg-background/80 px-4 backdrop-blur-md md:px-6">
          <SidebarTrigger className="md:hidden" />
          <div className="flex-1">
            <span className="text-sm font-medium text-muted-foreground">个人护肤品存量管理系统</span>
          </div>
        </header>
        <main className="flex-1 w-full overflow-x-hidden overflow-y-auto px-4 md:px-6 lg:px-8 py-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
