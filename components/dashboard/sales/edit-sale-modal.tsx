'use client';

import { CreateSaleModal } from './create-sale-modal';
import { Sale, UpdateSaleRequest } from '@/services/sales.service';

interface EditSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  onSave: (saleId: string, updatedSale: UpdateSaleRequest) => Promise<void>;
}

export function EditSaleModal({ isOpen, onClose, sale, onSave }: EditSaleModalProps) {
  return (
    <CreateSaleModal
      isOpen={isOpen}
      onClose={onClose}
      editingSale={sale}
      onSaleUpdated={onSave}
    />
  );
}