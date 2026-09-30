import { create } from 'zustand';

export const usePersistenceStatus = create<{ error: string | null }>(() => ({
  error: null,
}));

export function reportPersistenceError(error: string | null): void {
  usePersistenceStatus.setState({ error });
}
