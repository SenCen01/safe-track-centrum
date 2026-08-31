import { useEffect, useState } from "react";
import * as Location from "expo-location";
import * as Crypto from "expo-crypto";
import { supabase } from "./supabase";

// Product decision: ping every 15 seconds while a Shift is in_progress.
const PING_INTERVAL_MS = 15000;

export type TrackingStatus = "idle" | "tracking" | "denied";

// Pings the guard's current position on an interval while `active` is true,
// via the record_location_ping RPC (see supabase/migrations/20260831000000).
// A missed ping is best-effort — not worth surfacing to the guard, since the
// database already tolerates gaps (RLS/idempotency handle it, not this hook).
export function useLocationTracking(shiftId: string, active: boolean): TrackingStatus {
  const [status, setStatus] = useState<TrackingStatus>("idle");

  useEffect(() => {
    if (!active) {
      setStatus("idle");
      return;
    }

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function start() {
      const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;

      if (permStatus !== "granted") {
        setStatus("denied");
        return;
      }

      setStatus("tracking");

      async function ping() {
        try {
          const position = await Location.getCurrentPositionAsync({});
          if (cancelled) return;
          await supabase.rpc("record_location_ping", {
            p_shift_id: shiftId,
            p_client_ping_id: Crypto.randomUUID(),
            p_recorded_at: new Date().toISOString(),
            p_lat: position.coords.latitude,
            p_lng: position.coords.longitude,
          });
        } catch {
          // Best-effort; see comment above.
        }
      }

      ping();
      intervalId = setInterval(ping, PING_INTERVAL_MS);
    }

    start();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [shiftId, active]);

  return status;
}
