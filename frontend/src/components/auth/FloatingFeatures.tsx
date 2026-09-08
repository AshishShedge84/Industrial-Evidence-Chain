import { motion } from 'framer-motion';
import { Shield, QrCode, Camera, Box, Activity, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

const FEATURES = [
  { id: 'ledger', label: 'Asset Ledger', icon: Box, color: 'text-indigo-500', position: { top: '14%', left: '24%' }, delay: 0 },
  { id: 'verification', label: 'Verification', icon: Shield, color: 'text-primary-500', position: { top: '22%', left: '76%' }, delay: 1.5 },
  { id: 'qr', label: 'QR Mapping', icon: QrCode, color: 'text-amber-500', position: { top: '72%', left: '20%' }, delay: 0.5 },
  { id: 'integrity', label: 'Data Integrity', icon: CheckCircle2, color: 'text-emerald-500', position: { top: '74%', left: '70%' }, delay: 2 },
  { id: 'capture', label: 'Live Capture', icon: Camera, color: 'text-blue-500', position: { top: '46%', left: '8%' }, delay: 1 },
  { id: 'audit', label: 'Audit Trail', icon: Activity, color: 'text-rose-500', position: { top: '44%', left: '82%' }, delay: 2.5 },
];

export function FloatingFeatures() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {FEATURES.map((feature) => (
        <FloatingNode 
          key={feature.id} 
          feature={feature} 
          isHovered={hoveredId === feature.id}
          isDimmed={hoveredId !== null && hoveredId !== feature.id}
          onHover={() => setHoveredId(feature.id)}
          onLeave={() => setHoveredId(null)}
        />
      ))}
    </div>
  );
}

function FloatingNode({ feature, isHovered, isDimmed, onHover, onLeave }: any) {
  const { icon: Icon, label, color, position, delay } = feature;

  return (
    <motion.div
      className="absolute flex flex-col items-center pointer-events-auto"
      style={{ top: position.top, left: position.left }}
      animate={isHovered ? {
        y: 0,
        scale: 1.1,
        zIndex: 50,
      } : { 
        y: [-4, 4, -4], 
        scale: isDimmed ? 0.95 : 1,
        opacity: isDimmed ? 0.5 : 1,
        zIndex: 10,
      }}
      transition={isHovered ? { duration: 0.2 } : { 
        y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay },
        opacity: { duration: 0.3 },
        scale: { duration: 0.3 },
      }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <div className={`relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-white/80 dark:bg-black/60 backdrop-blur-xl rounded-2xl shadow-lg border border-black/5 dark:border-white/10 cursor-pointer transition-colors ${isHovered ? 'shadow-xl border-black/10 dark:border-white/20' : ''}`}>
        <Icon className={`w-1/2 h-1/2 ${color}`} />
        
        {/* Subtle glow behind icon when hovered */}
        {isHovered && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`absolute inset-0 rounded-2xl blur-md -z-10 bg-current opacity-20 ${color}`}
          />
        )}
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 5 }}
        transition={{ duration: 0.2 }}
        className="absolute top-[110%] px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none"
      >
        {label}
      </motion.div>
    </motion.div>
  );
}
