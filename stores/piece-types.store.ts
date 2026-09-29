import { create } from 'zustand';
import { piecesAdmin, type PieceTypeItem } from '@/services/pieces.admin.service';

const byName = (a: PieceTypeItem, b: PieceTypeItem) =>
  a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });

interface PieceTypesState {
  items: PieceTypeItem[];
  loaded: boolean;
  /** Carga una vez (lo comparten todos los selectores abiertos). */
  load: (force?: boolean) => Promise<void>;
  create: (name: string) => Promise<PieceTypeItem>;
  update: (id: string, name: string) => Promise<PieceTypeItem>;
  remove: (id: string) => Promise<void>;
}

let inflight: Promise<void> | null = null;

export const usePieceTypesStore = create<PieceTypesState>((set, get) => ({
  items: [],
  loaded: false,
  load: async (force = false) => {
    if (get().loaded && !force) return;
    if (!inflight) {
      inflight = piecesAdmin
        .listTypes()
        .then((items) => set({ items: [...items].sort(byName), loaded: true }))
        .finally(() => {
          inflight = null;
        });
    }
    return inflight;
  },
  create: async (name) => {
    const t = await piecesAdmin.createType(name);
    set({ items: [...get().items, t].sort(byName) });
    return t;
  },
  update: async (id, name) => {
    const t = await piecesAdmin.updateType(id, name);
    set({ items: get().items.map((x) => (x.id === id ? t : x)).sort(byName) });
    return t;
  },
  remove: async (id) => {
    await piecesAdmin.removeType(id);
    set({ items: get().items.filter((x) => x.id !== id) });
  },
}));
