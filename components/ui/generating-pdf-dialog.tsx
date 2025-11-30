'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

interface GeneratingPdfDialogProps {
  isOpen: boolean;
}

export function GeneratingPdfDialog({ isOpen }: GeneratingPdfDialogProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setDots('');
      return;
    }

    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev.length >= 3) {
          return '';
        }
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isOpen]);

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <div className="flex flex-col items-center justify-center p-6 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#9d684e]" />
          <p className="text-lg font-medium text-[#455a54]">
            Generando PDF{dots}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

