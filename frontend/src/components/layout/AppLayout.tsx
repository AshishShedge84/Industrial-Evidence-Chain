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
      <div className="min-h-screen bg-transparent transition-colors duration-300 relative z-0">
      <VideoBackground />
      <Sidebar />
      <Header />
      <MobileNav onClose={() => setMobileMenuOpen(false)} />

      <main
        className={`transition-all duration-300 pt-[72px] ${
          sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'
        }`}
      >
        <div className="p-4 md:p-8 lg:p-10 max-w-[1400px] mx-auto">
          <Outlet key={location.pathname} />
        </div>
      </main>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <AssistantLauncher />
      <AssistantWindow />
    </div>
    </AssistantProvider>
  );
}