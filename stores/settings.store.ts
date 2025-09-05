import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PaymentMethodSettings {
  efectivo: {
    discountPercentage: number; // Descuento por pago en efectivo (ej: 5%)
    enabled: boolean;
  };
  tarjeta: {
    discountPercentage: number;
    surchargePercentage: number; // Recargo por tarjeta (ej: 3% por comisión)
    enabled: boolean;
  };
  transferencia: {
    discountPercentage: number;
    surchargePercentage: number;
    enabled: boolean;
  };
  // Nuevos métodos: permiten descuento o recargo según prefiera el usuario
  qr: {
    discountPercentage: number;
    surchargePercentage: number;
    enabled: boolean;
  };
  giftcard: {
    discountPercentage: number;
    surchargePercentage: number;
    enabled: boolean;
  };
  precio_lista: {
    discountPercentage: number;
    surchargePercentage: number;
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
      discountPercentage: 0,
      surchargePercentage: 3,
      enabled: true,
    },
    transferencia: {
      discountPercentage: 0,
      surchargePercentage: 0,
      enabled: true,
    },
    qr: {
      discountPercentage: 0,
      surchargePercentage: 0,
      enabled: true,
    },
    giftcard: {
      discountPercentage: 0,
      surchargePercentage: 0,
      enabled: true,
    },
    precio_lista: {
      discountPercentage: 0,
      surchargePercentage: 0,
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
          set(state => {
            const prev = state.settings.paymentMethods[method] ?? defaultSettings.paymentMethods[method];
            return {
              settings: {
                ...state.settings,
                paymentMethods: {
                  ...state.settings.paymentMethods,
                  [method]: {
                    ...prev,
                    ...(newSettings as PaymentMethodSettings[keyof PaymentMethodSettings]),
                  },
                },
              },
            };
          });
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
          const methodSettings = settings.paymentMethods[paymentMethod] ?? defaultSettings.paymentMethods[paymentMethod];

          let adjustmentPercentage = 0;
          let adjustmentType: 'descuento' | 'recargo' | 'ninguno' = 'ninguno';

          switch (paymentMethod) {
            case 'efectivo': {
              const s = methodSettings as PaymentMethodSettings['efectivo'];
              if (s.discountPercentage > 0) {
                adjustmentPercentage = -s.discountPercentage;
                adjustmentType = 'descuento';
              }
              break;
            }
            case 'tarjeta': {
              const s = methodSettings as PaymentMethodSettings['tarjeta'];
              if (s.surchargePercentage > 0) {
                adjustmentPercentage = s.surchargePercentage;
                adjustmentType = 'recargo';
              } else if (s.discountPercentage > 0) {
                adjustmentPercentage = -s.discountPercentage;
                adjustmentType = 'descuento';
              }
              break;
            }
            case 'transferencia': {
              const s = methodSettings as PaymentMethodSettings['transferencia'];
              if (s.surchargePercentage > 0) {
                adjustmentPercentage = s.surchargePercentage;
                adjustmentType = 'recargo';
              } else if (s.discountPercentage > 0) {
                adjustmentPercentage = -s.discountPercentage;
                adjustmentType = 'descuento';
              }
              break;
            }
            case 'qr': {
              const s = methodSettings as PaymentMethodSettings['qr'];
              if (s.surchargePercentage > 0) {
                adjustmentPercentage = s.surchargePercentage;
                adjustmentType = 'recargo';
              } else if (s.discountPercentage > 0) {
                adjustmentPercentage = -s.discountPercentage;
                adjustmentType = 'descuento';
              }
              break;
            }
            case 'giftcard': {
              const s = methodSettings as PaymentMethodSettings['giftcard'];
              if (s.surchargePercentage > 0) {
                adjustmentPercentage = s.surchargePercentage;
                adjustmentType = 'recargo';
              } else if (s.discountPercentage > 0) {
                adjustmentPercentage = -s.discountPercentage;
                adjustmentType = 'descuento';
              }
              break;
            }
            case 'precio_lista': {
              const s = methodSettings as PaymentMethodSettings['precio_lista'];
              if (s.surchargePercentage > 0) {
                adjustmentPercentage = s.surchargePercentage;
                adjustmentType = 'recargo';
              } else if (s.discountPercentage > 0) {
                adjustmentPercentage = -s.discountPercentage;
                adjustmentType = 'descuento';
              }
              break;
            }
            case 'mixto': {
              adjustmentType = 'ninguno';
              break;
            }
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




