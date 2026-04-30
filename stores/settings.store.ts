import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PaymentMethodSettings {
  efectivo: {
    discountPercentage: number; // Descuento por pago en efectivo (ej: 5%)
    enabled: boolean;
  };
  tarjeta: {
    surchargePercentage: number; // Recargo por tarjeta (ej: 3% por comisión)
    enabled: boolean;
  };
  transferencia: {
    discountPercentage: number; // Sin recargo/descuento por defecto
    enabled: boolean;
  };
  mixto: {
    enabled: boolean;
  };
}

export interface ReceiptSettings {
  showLogo: boolean;
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  showPaymentMethodDetails: boolean;
  showEmployeeInfo: boolean;
  footerMessage: string;
}

export interface AppSettings {
  paymentMethods: PaymentMethodSettings;
  receipt: ReceiptSettings;
  general: {
    taxRate: number;
    allowNegativeStock: boolean;
    requireCustomerInfo: boolean;
    autoGenerateReceipt: boolean;
    lowStockWarning: boolean;
  };
}

interface SettingsState {
  settings: AppSettings;
  actions: {
    updatePaymentMethodSettings: (method: keyof PaymentMethodSettings, settings: Partial<PaymentMethodSettings[keyof PaymentMethodSettings]>) => void;
    updateReceiptSettings: (settings: Partial<ReceiptSettings>) => void;
    updateGeneralSettings: (settings: Partial<AppSettings['general']>) => void;
    resetToDefaults: () => void;
    calculatePaymentAdjustment: (amount: number, paymentMethod: keyof PaymentMethodSettings) => {
      adjustmentAmount: number;
      adjustmentPercentage: number;
      finalAmount: number;
      adjustmentType: 'descuento' | 'recargo' | 'ninguno';
    };
  };
}

const defaultSettings: AppSettings = {
  paymentMethods: {
    efectivo: {
      discountPercentage: 5,
      enabled: true,
    },
    tarjeta: {
      surchargePercentage: 3,
      enabled: true,
    },
    transferencia: {
      discountPercentage: 0,
      enabled: true,
    },
    mixto: {
      enabled: true,
    },
  },
  receipt: {
    showLogo: true,
    businessName: 'MÍSTICA',
    businessAddress: 'Dirección del negocio',
    businessPhone: 'Teléfono del negocio',
    showPaymentMethodDetails: true,
    showEmployeeInfo: true,
    footerMessage: 'Gracias por su compra',
  },
  general: {
    taxRate: 21, // IVA 21%
    allowNegativeStock: false,
    requireCustomerInfo: false,
    autoGenerateReceipt: true,
    lowStockWarning: true,
  },
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      actions: {
        updatePaymentMethodSettings: (method, newSettings) => {
          set(state => ({
            settings: {
              ...state.settings,
              paymentMethods: {
                ...state.settings.paymentMethods,
                [method]: {
                  ...state.settings.paymentMethods[method],
                  ...newSettings,
                },
              },
            },
          }));
        },

        updateReceiptSettings: (newSettings) => {
          set(state => ({
            settings: {
              ...state.settings,
              receipt: {
                ...state.settings.receipt,
                ...newSettings,
              },
            },
          }));
        },

        updateGeneralSettings: (newSettings) => {
          set(state => ({
            settings: {
              ...state.settings,
              general: {
                ...state.settings.general,
                ...newSettings,
              },
            },
          }));
        },

        resetToDefaults: () => {
          set({ settings: defaultSettings });
        },

        calculatePaymentAdjustment: (amount, paymentMethod) => {
          const { settings } = get();
          const methodSettings = settings.paymentMethods[paymentMethod];

          if (!methodSettings.enabled) {
            return {
              adjustmentAmount: 0,
              adjustmentPercentage: 0,
              finalAmount: amount,
              adjustmentType: 'ninguno' as const,
            };
          }

          let adjustmentPercentage = 0;
          let adjustmentType: 'descuento' | 'recargo' | 'ninguno' = 'ninguno';

          switch (paymentMethod) {
            case 'efectivo':
              if ('discountPercentage' in methodSettings) {
                adjustmentPercentage = -methodSettings.discountPercentage; // Negativo para descuento
                adjustmentType = 'descuento';
              }
              break;
            case 'tarjeta':
              if ('surchargePercentage' in methodSettings) {
                adjustmentPercentage = methodSettings.surchargePercentage; // Positivo para recargo
                adjustmentType = 'recargo';
              }
              break;
            case 'transferencia':
              if ('discountPercentage' in methodSettings) {
                adjustmentPercentage = -methodSettings.discountPercentage; // Negativo para descuento
                adjustmentType = methodSettings.discountPercentage > 0 ? 'descuento' : 'ninguno';
              }
              break;
            case 'mixto':
              // Para pago mixto no aplicamos descuentos/recargos automáticos
              adjustmentType = 'ninguno';
              break;
          }

          const adjustmentAmount = (amount * Math.abs(adjustmentPercentage)) / 100;
          const finalAmount = amount + (amount * adjustmentPercentage) / 100;

          return {
            adjustmentAmount,
            adjustmentPercentage: Math.abs(adjustmentPercentage),
            finalAmount,
            adjustmentType,
          };
        },
      },
    }),
    {
      name: 'mistica-settings-storage',
      partialize: (state) => ({
        settings: state.settings,
      }),
    }
  )
);