import { motion } from 'framer-motion';
import { MemojiAvatar } from './MemojiAvatar';
import { FloatingFeatures } from './FloatingFeatures';

interface LoginWelcomeProps {
  onSignIn: () => void;
  onCreateAccount: () => void;
}

export function LoginWelcome({ onSignIn, onCreateAccount }: LoginWelcomeProps) {
  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto relative z-10 text-center px-4">
      
      {/* Central Visual Composition */}
      <div className="relative w-[320px] h-[320px] xs:w-[350px] xs:h-[350px] sm:w-[480px] sm:h-[480px] flex items-center justify-center mb-4 sm:mb-8 mt-1 sm:mt-4">
        <FloatingFeatures />
        <MemojiAvatar />
      </div>

      {/* Typography & Identity */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="flex flex-col items-center w-full"
      >
        <h1 className="text-2xl sm:text-[34px] font-medium tracking-tight text-gray-900 dark:text-white leading-tight mb-5 sm:mb-8">
          Industrial Evidence Chain
        </h1>
        
        <div className="w-full flex flex-col gap-2.5 sm:gap-3 px-2 sm:px-12 max-w-[340px]">
          <button
            onClick={onSignIn}
            className="w-full bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 text-sm sm:text-[15px] font-medium h-[44px] sm:h-[46px] rounded-full transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
          >
            Sign In
          </button>
          <button
            onClick={onCreateAccount}
            className="w-full bg-transparent hover:bg-black/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700/50 text-sm sm:text-[15px] font-medium h-[44px] sm:h-[46px] rounded-full transition-colors active:scale-[0.98]"
          >
            Create Account
          </button>
        </div>

        <p className="mt-5 sm:mt-8 text-xs sm:text-[14px] text-gray-500 dark:text-gray-400 font-medium max-w-[280px]">
          Trusted evidence for every industrial operation.
        </p>
      </motion.div>
    </div>
  );
}
