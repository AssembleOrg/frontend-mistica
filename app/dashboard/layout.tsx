import { AppSidebar } from '@/components/app-sidebar';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { MysticCrystal } from '@/components/mystic-crystal';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <MysticCrystal color='#4e4247' />
      <AppSidebar />
      <SidebarInset>
        <header className='flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 px-4 border-b border-[#9d684e]/10'>
          <div className='flex items-center gap-2 w-full'>
            <SidebarTrigger className='-ml-1 touch-target' />
            <div className='text-sm text-[#455a54] font-winter-solid truncate flex-1'>
              Dashboard / Panel Principal
            </div>
          </div>
        </header>
        <div
          className='flex flex-1 flex-col gap-4 p-2 sm:p-4 pt-2 sm:pt-4 overflow-x-hidden'
          style={{ backgroundColor: '#efcbb9' }}
        >
          <div className="container-mobile">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
