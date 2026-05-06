'use client';

import React from 'react';
import { CreateSaleModal } from './create-sale-modal';
import { Sale, UpdateSaleRequest } from '@/services/sales.service';

interface EditSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  onSave: (saleId: string, updatedSale: UpdateSaleRequest) => Promise<void>;
  submitButtonRef?: React.RefObject<HTMLButtonElement | null>;
}

export function EditSaleModal({ isOpen, onClose, sale, onSave, submitButtonRef }: EditSaleModalProps) {
  return (
    <CreateSaleModal
      isOpen={isOpen}
      onClose={onClose}
      editingSale={sale}
      onSaleUpdated={onSave}
      submitButtonRef={submitButtonRef}
    />
  );
}