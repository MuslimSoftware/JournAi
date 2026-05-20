import { useSync as useSyncGlobal } from '../contexts/SyncContext';

export function useSync() {
  return useSyncGlobal();
}
