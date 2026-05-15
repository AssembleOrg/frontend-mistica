import { AppSidebar } from '@/components/app-sidebar';
import { AuthHydrator } from '@/components/auth-hydrator';
import { AutoClosureNotifier } from '@/components/dashboard/cashbox/auto-closure-notifier';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AuthHydrator />
      <AutoClosureNotifier />
      <AppSidebar />
      <SidebarInset>
        <header className='flex h-16 shrink-0 items-center gap-2 px-4 border-b border-[#9d684e]/10'>
          <SidebarTrigger className='-ml-1 touch-target shrink-0' />
          <div className='flex flex-col justify-center gap-0.5'>
            <span className='text-xs text-[#455a54] font-winter-solid whitespace-nowrap leading-none'>
              Dashboard / Panel Principal
            </span>
            <span
              aria-hidden='true'
              className='inline-flex items-center gap-1 text-[10px] text-[#9d684e] italic whitespace-nowrap leading-none'
            >
              <svg
                width='14'
                height='8'
                viewBox='0 0 14 8'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
                className='shrink-0'
              >
                <path
                  d='M12 7 Q 7 6 2 1.5'
                  stroke='#9d684e'
                  strokeWidth='1.2'
                  strokeLinecap='round'
                  fill='none'
                />
                <path
                  d='M2 1.5 L 5 2.5 M 2 1.5 L 3 5'
                  stroke='#9d684e'
                  strokeWidth='1.2'
                  strokeLinecap='round'
                  fill='none'
                />
              </svg>
              podés abrir o cerrar el panel con este ícono
            </span>
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
