import type { ReactNode } from 'react';
import { AuthProvider } from '@context/AuthContext';
import { AppProvider } from '@context/AppContext';
import { ToastContainer } from '@components/ui/Toast';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AppProvider>
      <AuthProvider>
        {children}
        <ToastContainer />
      </AuthProvider>
    </AppProvider>
  );
}