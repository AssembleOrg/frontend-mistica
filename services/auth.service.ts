// services/auth.service.ts

import type { User } from '@/types/user.types';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResponse {
  user: User;
  token: string;
}

const login = async ({
  email,
  password,
}: LoginCredentials): Promise<LoginResponse> => {
  // const response = await fetch(`${API_URL}/auth/login`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ email, password }),
  // });
  //

  // --- MOCK ---
  //
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (email === 'admin@mistica.com') {
        resolve({
          user: {
            id: '1',
            name: 'Admin Mística',
            email: 'admin@mistica.com',
            role: 'administrador',
          },
          token: 'un-jwt-valido-y-secreto',
        });
      } else {
        reject(
          new Error('Credenciales inválidas. Por favor, inténtalo de nuevo.')
        );
      }
    }, 1000);
  });
  // --- FIN DEL MOCK ---
};

export const authService = {
  login,
};
