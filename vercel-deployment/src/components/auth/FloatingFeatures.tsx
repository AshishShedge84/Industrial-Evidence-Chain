import { Shield, QrCode, Camera, Box, Activity, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

const FEATURES = [
  { id: 'ledger', label: 'Asset Ledger', icon: Box, color: 'text-indigo-500', position: { top: '19%', left: '29%' }, delay: 0 },
  { id: 'verification', label: 'Verification', icon: Shield, color: 'text-primary-500', position: { top: '26%', left: '77%' }, delay: 1.5 },
  { id: 'capture', label: 'Live Capture', icon: Camera, color: 'text-blue-500', position: { top: '50%', left: '15%' }, delay: 1 },
  { id: 'audit', label: 'Audit Trail', icon: Activity, color: 'text-rose-500', position: { top: '48%', left: '85%' }, delay: 2.5 },
  { id: 'qr', label: 'QR Mapping', icon: QrCode, color: 'text-amber-500', position: { top: '74%', left: '26%' }, delay: 0.5 },
  { id: 'integrity', label: 'Data Integrity', icon: CheckCircle2, color: 'text-emerald-500', position: { top: '76%', left: '74%' }, delay: 2 },
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
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-auto"
      style={{ top: position.top, left: position.left }}
    >
      <div
        className="animate-iec-float"
        style={{ animationDelay: `${delay}s` }}
      >
        <div
          className={`flex flex-col items-center transition-all duration-300 ${
            isHovered ? 'scale-110' : (isDimmed ? 'scale-95 opacity-45' : 'scale-100 opacity-100')
          }`}
          onMouseEnter={onHover}
          onMouseLeave={onLeave}
        >
          <div className={`relative flex items-center justify-center w-11 h-11 xs:w-12 xs:h-12 sm:w-14 sm:h-14 bg-white/85 dark:bg-black/65 backdrop-blur-xl rounded-2xl shadow-md sm:shadow-lg border border-black/5 dark:border-white/10 cursor-pointer transition-all ${isHovered ? 'shadow-xl border-black/10 dark:border-white/20' : ''}`}>
            <Icon className={`w-[22px] h-[22px] sm:w-7 sm:h-7 ${color}`} />
            
            {/* Subtle glow behind icon when hovered */}
            {isHovered && (
              <div 
                className={`absolute inset-0 rounded-2xl blur-md -z-10 bg-current opacity-20 ${color} animate-fade-in`}
              />
            )}
          </div>

          <div 
            className={`absolute top-[115%] px-2.5 sm:px-3 py-1 sm:py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[11px] sm:text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none transition-all duration-200 ${
              isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
            }`}
          >
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}
