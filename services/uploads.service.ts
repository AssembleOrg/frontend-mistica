// services/uploads.service.ts
//
// Carga de imágenes al backend (que las convierte a WebP y las sube a
// DigitalOcean Spaces). Multipart directo por el proxy /api (la cookie
// httpOnly viaja sola); no usa apiService porque éste fija Content-Type JSON.

import { getApiBaseUrl } from '@/lib/api/base-url';

export interface UploadedImage {
  key: string;
  url: string;
  size: number;
}

export type UploadFolder = 'piezas' | 'experiencias' | 'general';

export const uploads = {
  /** Sube una imagen y devuelve su URL pública. */
  image: async (
    file: File,
    folder: UploadFolder = 'general',
  ): Promise<UploadedImage> => {
    const form = new FormData();
    form.append('image', file);
    form.append('folder', folder);
    const res = await fetch(`${getApiBaseUrl()}/uploads/image`, {
      method: 'POST',
      body: form,
      credentials: 'include',
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(
        (data as { message?: string } | null)?.message ??
          'No se pudo subir la imagen',
      );
    }
    return (await res.json()) as UploadedImage;
  },
};
