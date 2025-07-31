'use client';

interface MysticCrystalProps {
  color?: string;
  className?: string;
}

export function MysticCrystal({ 
  color = '#9d684e',
  className = ''
}: MysticCrystalProps) {
  return (
    <div 
      className={`fixed top-4 right-4 z-50 ${className}`}
      style={{
        animation: 'mystical-float 6s ease-in-out infinite',
      }}
    >
      <div
        className="relative w-12 h-12 rotate-45"
        style={{
          background: `linear-gradient(135deg, ${color}80, ${color}40)`,
          backdropFilter: 'blur(5px)',
          borderRadius: '20%',
          border: `1px solid ${color}60`,
          boxShadow: `0 4px 20px ${color}30, inset 0 1px 0 rgba(255,255,255,0.2)`,
          animation: 'crystal-rotate 20s linear infinite',
        }}
      >
        {/* Efecto de brillo interno */}
        <div
          className="absolute inset-2 rounded-sm"
          style={{
            background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3), transparent 70%)`,
            animation: 'crystal-shine 8s ease-in-out infinite',
          }}
        />
        
        {/* Punto central místico */}
        <div
          className="absolute top-1/2 left-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: color,
            boxShadow: `0 0 6px ${color}80`,
            animation: 'crystal-pulse 4s ease-in-out infinite',
          }}
        />
      </div>
    </div>
  );
}