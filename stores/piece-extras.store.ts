import { create } from 'zustand';
import { piecesAdmin, type PieceExtraItem } from '@/services/pieces.admin.service';

const byAmount = (a: PieceExtraItem, b: PieceExtraItem) =>
  a.amount - b.amount || a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });

type ExtraInput = { name: string; amount: number; pair?: boolean };

interface PieceExtrasState {
  items: PieceExtraItem[];
  loaded: boolean;
  /** Carga una vez (lo comparten todas las fichas abiertas). */
  load: (force?: boolean) => Promise<void>;
  create: (input: ExtraInput) => Promise<PieceExtraItem>;
  update: (id: string, input: ExtraInput) => Promise<PieceExtraItem>;
  remove: (id: string) => Promise<void>;
}

let inflight: Promise<void> | null = null;

export const usePieceExtrasStore = create<PieceExtrasState>((set, get) => ({
  items: [],
  loaded: false,
  load: async (force = false) => {
    if (get().loaded && !force) return;
    if (!inflight) {
      inflight = piecesAdmin
        .listExtras()
        .then((items) => set({ items: [...items].sort(byAmount), loaded: true }))
        .finally(() => {
          inflight = null;
        });
    }
    return inflight;
  },
  create: async (input) => {
    const x = await piecesAdmin.createExtra(input);
    set({ items: [...get().items, x].sort(byAmount) });
    return x;
  },
  update: async (id, input) => {
    const x = await piecesAdmin.updateExtra(id, input);
    set({ items: get().items.map((i) => (i.id === id ? x : i)).sort(byAmount) });
    return x;
  },
  remove: async (id) => {
    await piecesAdmin.removeExtra(id);
    set({ items: get().items.filter((i) => i.id !== id) });
  },
}));
