import * as React from "react"

// Breakpoints consistentes con Tailwind CSS
const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
} as const

export function useResponsive() {
  const [dimensions, setDimensions] = React.useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  })

  React.useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    // Solo ejecutar en el cliente
    if (typeof window !== 'undefined') {
      handleResize() // Set initial size
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [])

  return {
    // Dimensiones exactas
    width: dimensions.width,
    height: dimensions.height,
    
    // Breakpoints booleanos
    isSm: dimensions.width >= BREAKPOINTS.sm,
    isMd: dimensions.width >= BREAKPOINTS.md,
    isLg: dimensions.width >= BREAKPOINTS.lg,
    isXl: dimensions.width >= BREAKPOINTS.xl,
    is2xl: dimensions.width >= BREAKPOINTS['2xl'],
    
    // Categorías de dispositivo
    isMobile: dimensions.width < BREAKPOINTS.md,
    isTablet: dimensions.width >= BREAKPOINTS.md && dimensions.width < BREAKPOINTS.lg,
    isDesktop: dimensions.width >= BREAKPOINTS.lg,
    
    // Breakpoints específicos
    isSmallMobile: dimensions.width < BREAKPOINTS.sm,
    isLargeMobile: dimensions.width >= BREAKPOINTS.sm && dimensions.width < BREAKPOINTS.md,
    
    // Helpers para CSS classes
    getResponsiveClass: (mobile: string, tablet: string, desktop: string) => {
      if (dimensions.width < BREAKPOINTS.md) return mobile
      if (dimensions.width < BREAKPOINTS.lg) return tablet
      return desktop
    },
    
    // Helper para mostrar/ocultar elementos
    shouldShow: (breakpoint: keyof typeof BREAKPOINTS) => {
      return dimensions.width >= BREAKPOINTS[breakpoint]
    }
  }
}

// Hook legacy para compatibilidad
export function useIsMobile() {
  const { isMobile } = useResponsive()
  return isMobile
}
