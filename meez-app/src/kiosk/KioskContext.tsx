import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { kioskSupervisor, KioskSupervisor } from "@/kiosk/KioskSupervisor";
import type { KioskSnapshot } from "@/kiosk/types";

const KioskContext = createContext<KioskSupervisor | null>(null);

export function KioskProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    void kioskSupervisor.start();
    return () => {
      // Keep polling across remounts in production; only stop in tests if needed.
    };
  }, []);

  return (
    <KioskContext.Provider value={kioskSupervisor}>{children}</KioskContext.Provider>
  );
}

export function useKioskSupervisor(): KioskSupervisor {
  const supervisor = useContext(KioskContext);
  if (!supervisor) {
    throw new Error("useKioskSupervisor must be used within KioskProvider");
  }
  return supervisor;
}

export function useKioskSnapshot(): KioskSnapshot {
  const supervisor = useKioskSupervisor();
  return useSyncExternalStore(
    supervisor.subscribe,
    supervisor.getSnapshot,
    supervisor.getSnapshot,
  );
}

export function useKiosk(): {
  snapshot: KioskSnapshot;
  supervisor: KioskSupervisor;
} {
  const supervisor = useKioskSupervisor();
  const snapshot = useKioskSnapshot();
  return useMemo(() => ({ snapshot, supervisor }), [snapshot, supervisor]);
}
