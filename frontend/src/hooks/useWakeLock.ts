import { useCallback, useEffect, useRef } from "react";

export function useWakeLock() {
  const lockRef = useRef<WakeLockSentinel | null>(null);

  const request = useCallback(async () => {
    if (!("wakeLock" in navigator)) return;
    try {
      lockRef.current = await navigator.wakeLock.request("screen");
    } catch {
      // 非対応・権限拒否は無視（画面が自動スリープする可能性を許容）
    }
  }, []);

  const release = useCallback(async () => {
    try {
      await lockRef.current?.release();
    } catch {
      // すでに解放済み等は無視
    }
    lockRef.current = null;
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (lockRef.current !== null && document.visibilityState === "visible") {
        void request();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [request]);

  return { request, release };
}
