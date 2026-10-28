import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { useApp } from '@context/AppContext';
import { VideoBackground } from '@components/ui';
import { AssistantLauncher, AssistantWindow } from '@components/assistant';
import { AssistantProvider } from '@context/AssistantContext';

export function AppLayout() {
  const { sidebarOpen, mobileMenuOpen, setMobileMenuOpen } = useApp();
  const location = useLocation();

  return (
    <AssistantProvider>
      <div className="min-h-screen bg-transparent transition-colors duration-300 relative z-0 w-full max-w-full overflow-x-hidden">
      <VideoBackground />
      <Sidebar />
      <Header />
      <MobileNav onClose={() => setMobileMenuOpen(false)} />

      <main
        className={`w-full min-w-0 transition-all duration-300 pt-[68px] sm:pt-[72px] ${
          sidebarOpen
            ? 'lg:ml-64 lg:w-[calc(100%-16rem)]'
            : 'lg:ml-20 lg:w-[calc(100%-5rem)]'
        }`}
      >
        <div className="w-full min-w-0 box-border p-3 sm:p-4 md:p-8 lg:p-10 max-w-[1400px] mx-auto">
          <Outlet key={location.pathname} />
        </div>
      </main>

      <AssistantLauncher />
      <AssistantWindow />
    </div>
    </AssistantProvider>
  );
}