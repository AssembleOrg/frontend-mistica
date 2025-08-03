'use client';

// AuthProvider is now simplified since Zustand persist handles 
// automatic state hydration and initialization
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Zustand persist middleware automatically handles:
  // - State rehydration from localStorage
  // - SSR compatibility 
  // - Authentication state restoration
  return <>{children}</>;
}