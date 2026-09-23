export function VideoBackground({ 
  src = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260809_012548_ef22562c-c0ae-4816-ad9d-f8922af4e6a7.mp4',
  variant = 'dashboard'
}: { 
  src?: string,
  variant?: 'dashboard' | 'login'
}) {
  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden bg-white dark:bg-black">
      <video
        key="iec-global-video-bg"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src={src} type="video/mp4" />
      </video>

      {/* Base Gradient Overlay for Readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/10 dark:from-black/40 dark:via-black/20 dark:to-black/60 pointer-events-none" />
      
      {/* Top Subtle Ambient Warm Glow / Burning Bloom */}
      <div 
        className="absolute -top-20 left-1/2 -translate-x-1/2 w-[90vw] max-w-[750px] h-[220px] rounded-full pointer-events-none opacity-35 dark:opacity-25 blur-[36px]"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(249, 115, 22, 0.4) 0%, rgba(225, 29, 72, 0.2) 45%, rgba(147, 51, 234, 0.08) 70%, transparent 100%)',
        }}
        aria-hidden="true"
      />

      {/* Login Specific Atmospheric Effects */}
      {variant === 'login' && (
        <div className="absolute inset-0 backdrop-blur-[6px] pointer-events-none" />
      )}
    </div>
  );
}
