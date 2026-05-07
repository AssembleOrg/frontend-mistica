'use client';

import { RefObject } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Sale } from '@/services/sales.service';

interface KbdShortcutsProps {
  sales: Sale[];
  selectedSale: Sale | null;
  onSelectSale: (sale: Sale) => void;
  showCreateSaleModal: boolean;
  showEditSaleModal: boolean;
  onOpenCreateModal: () => void;
  onCloseCreateModal: () => void;
  onCloseEditModal: () => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  submitCreateButtonRef: RefObject<HTMLButtonElement | null>;
  submitEditButtonRef: RefObject<HTMLButtonElement | null>;
  searchValue: string;
  onSearchChange: (v: string) => void;
  onRequestEdit: (sale: Sale) => void;
  onViewReceipt: (sale: Sale) => void;
}

export function KbdShortcuts({
  sales,
  selectedSale,
  onSelectSale,
  showCreateSaleModal,
  showEditSaleModal,
  onOpenCreateModal,
  onCloseCreateModal,
  onCloseEditModal,
  searchInputRef,
  submitCreateButtonRef,
  submitEditButtonRef,
  searchValue,
  onSearchChange,
  onRequestEdit,
  onViewReceipt,
}: KbdShortcutsProps) {
  const selectedIndex = sales.findIndex(s => s.id === selectedSale?.id);

  // F2: submit modal abierto, o abrir modal de creación
  useHotkeys(
    'f2',
    (e) => {
      e.preventDefault();
      if (showCreateSaleModal) {
        submitCreateButtonRef.current?.click();
      } else if (showEditSaleModal) {
        submitEditButtonRef.current?.click();
      } else {
        onOpenCreateModal();
      }
    },
    { enableOnFormTags: true },
    [showCreateSaleModal, showEditSaleModal],
  );

  // F10: foco al buscador y seleccionar todo el texto
  useHotkeys(
    'f10',
    (e) => {
      e.preventDefault();
      const el = searchInputRef.current;
      if (el) {
        el.focus();
        el.select();
      }
    },
    { enableOnFormTags: false },
    [],
  );

  // Flecha abajo: siguiente fila (bloqueado si hay modal abierto)
  useHotkeys(
    'ArrowDown',
    (e) => {
      e.preventDefault();
      if (showCreateSaleModal || showEditSaleModal) return;
      if (sales.length === 0) return;
      if (selectedIndex === -1) {
        onSelectSale(sales[0]);
      } else {
        onSelectSale(sales[Math.min(selectedIndex + 1, sales.length - 1)]);
      }
    },
    { enableOnFormTags: false },
    [selectedIndex, sales, showCreateSaleModal, showEditSaleModal],
  );

  // Flecha arriba: fila anterior (bloqueado si hay modal abierto)
  useHotkeys(
    'ArrowUp',
    (e) => {
      e.preventDefault();
      if (showCreateSaleModal || showEditSaleModal) return;
      if (sales.length === 0) return;
      if (selectedIndex === -1) {
        onSelectSale(sales[0]);
        return;
      }
      if (selectedIndex <= 0) return;
      onSelectSale(sales[selectedIndex - 1]);
    },
    { enableOnFormTags: false },
    [selectedIndex, sales, showCreateSaleModal, showEditSaleModal],
  );

  // Esc: cerrar modal activo, luego limpiar buscador. Recupera foco al cerrar modal.
  useHotkeys(
    'Escape',
    (e) => {
      if (showCreateSaleModal) {
        e.preventDefault();
        onCloseCreateModal();
        searchInputRef.current?.focus();
        return;
      }
      if (showEditSaleModal) {
        e.preventDefault();
        onCloseEditModal();
        searchInputRef.current?.focus();
        return;
      }
      if (searchValue.trim()) {
        e.preventDefault();
        onSearchChange('');
      }
    },
    { enableOnFormTags: true },
    [showCreateSaleModal, showEditSaleModal, searchValue],
  );

  // F3: editar venta seleccionada (solo PENDING)
  useHotkeys(
    'f3',
    (e) => {
      e.preventDefault();
      if (selectedSale?.status === 'PENDING') onRequestEdit(selectedSale);
    },
    { enableOnFormTags: false },
    [selectedSale],
  );

  // F4: ver comprobante (solo COMPLETED)
  useHotkeys(
    'f4',
    (e) => {
      e.preventDefault();
      if (selectedSale?.status === 'COMPLETED') onViewReceipt(selectedSale);
    },
    { enableOnFormTags: false },
    [selectedSale],
  );

  // Enter en el buscador: quitar foco y seleccionar primera fila
  useHotkeys(
    'Enter',
    (e) => {
      if (document.activeElement === searchInputRef.current) {
        e.preventDefault();
        (document.activeElement as HTMLElement).blur();
        if (sales.length > 0) onSelectSale(sales[0]);
      }
    },
    { enableOnFormTags: true },
    [sales, searchInputRef],
  );

  return null;
}
