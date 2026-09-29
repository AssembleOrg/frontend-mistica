'use client';

import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { uploads, type UploadFolder } from '@/services/uploads.service';

/**
 * Botón "Subir foto": abre el picker (en el celular ofrece la cámara), sube
 * la imagen al backend (WebP + DigitalOcean Spaces) y devuelve la URL pública
 * por onUploaded. Acepta varios archivos de una.
 */
export function ImageUploadButton({
  folder,
  onUploaded,
  className,
}: Readonly<{
  folder: UploadFolder;
  onUploaded: (url: string) => void;
  className?: string;
}>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const { url } = await uploads.image(file, folder);
        onUploaded(url);
      }
      showToast.success(files.length > 1 ? 'Fotos subidas' : 'Foto subida');
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo subir');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type='file'
        accept='image/*'
        multiple
        className='hidden'
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        type='button'
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className={
          className ??
          'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-[#e6dbcd] bg-white px-3 text-[13px] font-medium text-[#455a54] transition hover:bg-[#fbf5ef] disabled:opacity-50'
        }
      >
        <Upload className='h-4 w-4' />
        {busy ? 'Subiendo…' : 'Subir foto'}
      </button>
    </>
  );
}
