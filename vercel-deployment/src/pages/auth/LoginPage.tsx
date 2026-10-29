import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { LoginWelcome } from '@components/auth/LoginWelcome';
import { AuthFlow } from '@components/auth/AuthFlow';

import { VideoBackground } from '@components/ui';

export function LoginPage() {
  const [stage, setStage] = useState<'welcome' | 'login' | 'register'>('welcome');

  return (
    <div className="min-h-screen flex font-sans bg-transparent overflow-hidden relative selection:bg-primary-500/30">
      
      <VideoBackground variant="login" />

      {/* Main Content Area */}
      <main className="w-full min-h-[100dvh] flex items-center justify-center relative z-10 px-3 py-6 sm:px-6 sm:py-12">
        <AnimatePresence mode="wait">
          {stage === 'welcome' && (
            <motion.div 
              key="welcome"
              className="w-full flex justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
            >
              <LoginWelcome 
                onSignIn={() => setStage('login')} 
                onCreateAccount={() => setStage('register')} 
              />
            </motion.div>
          )}

          {(stage === 'login' || stage === 'register') && (
            <motion.div 
              key="auth"
              className="w-full flex justify-center"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <AuthFlow 
                initialMode={stage} 
                onBack={() => setStage('welcome')} 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Persistent Public Legal Links Footer */}
      <footer className="absolute bottom-2.5 sm:bottom-4 left-0 right-0 flex items-center justify-center gap-4 text-[11px] sm:text-xs text-gray-400 dark:text-gray-500 z-20 pointer-events-auto">
        <Link to="/privacy-policy" className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors underline-offset-4 hover:underline">
          Privacy Policy
        </Link>
        <span>•</span>
        <Link to="/terms-of-service" className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors underline-offset-4 hover:underline">
          Terms of Service
        </Link>
      </footer>
    </div>
  );
}