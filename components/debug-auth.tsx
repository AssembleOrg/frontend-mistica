// components/debug-auth.tsx
'use client';

import { useAuthStore } from '@/stores/auth.store';
import { useEffect, useState } from 'react';

export function DebugAuth() {
  const { user, token, isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs font-mono z-50">
      <h3 className="font-bold mb-2">🔍 Debug Auth State</h3>
      <div className="space-y-1">
        <div>Authenticated: <span className={isAuthenticated ? 'text-green-400' : 'text-red-400'}>{isAuthenticated ? 'YES' : 'NO'}</span></div>
        <div>Has User: <span className={user ? 'text-green-400' : 'text-red-400'}>{user ? 'YES' : 'NO'}</span></div>
        <div>Has Token: <span className={token ? 'text-green-400' : 'text-red-400'}>{token ? 'YES' : 'NO'}</span></div>
        {token && (
          <div>Token Length: <span className="text-yellow-400">{token.length}</span></div>
        )}
        {user && (
          <div>User ID: <span className="text-blue-400">{user.id}</span></div>
        )}
      </div>
    </div>
  );
}
