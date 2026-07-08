import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';

interface SessionContextValue {
  isLocked: boolean;
  lockSession: () => void;
  unlockSession: () => void;
  startInactivityTimer: () => void;
  resetInactivityTimer: () => void;
  inactivityTimeoutMinutes: number;
  setInactivityTimeout: (minutes: number) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

const DEFAULT_TIMEOUT = 5;

export function SessionProvider({ children }: { children: ReactNode }) {
  const [isLocked, setIsLocked] = useState(false);
  const [inactivityTimeoutMinutes, setInactivityTimeoutMinutes] = useState(DEFAULT_TIMEOUT);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lockSession = useCallback(() => {
    setIsLocked(true);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const unlockSession = useCallback(() => {
    setIsLocked(false);
  }, []);

  const resetInactivityTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (inactivityTimeoutMinutes > 0 && !isLocked) {
      timerRef.current = setTimeout(
        () => setIsLocked(true),
        inactivityTimeoutMinutes * 60 * 1000,
      );
    }
  }, [inactivityTimeoutMinutes, isLocked]);

  const startInactivityTimer = useCallback(() => {
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    const handler = () => resetInactivityTimer();

    events.forEach((e) => window.addEventListener(e, handler));
    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetInactivityTimer]);

  const setInactivityTimeout = useCallback((minutes: number) => {
    setInactivityTimeoutMinutes(minutes);
  }, []);

  return (
    <SessionContext.Provider
      value={{
        isLocked,
        lockSession,
        unlockSession,
        startInactivityTimer,
        resetInactivityTimer,
        inactivityTimeoutMinutes,
        setInactivityTimeout,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
