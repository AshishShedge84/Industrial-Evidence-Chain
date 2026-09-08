import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoginWelcome } from '@components/auth/LoginWelcome';
import { AuthFlow } from '@components/auth/AuthFlow';

import { VideoBackground } from '@components/ui';

export function LoginPage() {
  const [stage, setStage] = useState<'welcome' | 'login' | 'register'>('welcome');

  return (
    <div className="min-h-screen flex font-sans bg-transparent overflow-hidden relative selection:bg-primary-500/30">
      
      <VideoBackground variant="login" />

      {/* Main Content Area */}
      <main className="w-full h-full min-h-screen flex items-center justify-center relative z-10 px-6 py-12">
        <AnimatePresence mode="wait">
          {stage === 'welcome' && (
            <motion.div 
              key="welcome"
              className="w-full flex justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
              transition={{ duration: 0.5 }}
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
              initial={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <AuthFlow 
                initialMode={stage} 
                onBack={() => setStage('welcome')} 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}