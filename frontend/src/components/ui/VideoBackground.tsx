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
        autoPlay
        muted
        loop
        playsInline
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
          variant === 'login' ? 'opacity-100' : 'opacity-100'
        }`}
      >
        <source src={src} type="video/mp4" />
      </video>

      {/* Base Gradient Overlay for Readability */}
      <div className={`absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/10 dark:from-black/40 dark:via-black/20 dark:to-black/60 pointer-events-none`} />
      
      {/* Login Specific Atmospheric Effects */}
      {variant === 'login' && (
        <>
          {/* Subtle diffusion blur */}
          <div className="absolute inset-0 backdrop-blur-[6px] pointer-events-none" />
          
          {/* Soft noise/grain overlay for rainy window effect */}
          <div 
            className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" 
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} 
          />
        </>
      )}
    </div>
  );
}
