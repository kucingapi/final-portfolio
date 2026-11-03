"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { Prefs } from "@/lib/dashboard/push";
import { send, useApi } from "./api";
import { currentSubscription, deviceId, pushSupport, turnOff, turnOn, type PushSupport } from "./device";
import { toast } from "./ui/toaster";

export type DeviceRow = { id: string; name: string; createdAt: string };
export type { Prefs };

const PERMISSION = "dash:permission";
const onPermission = (cb: () => void) => {
  window.addEventListener(PERMISSION, cb);
  return () => window.removeEventListener(PERMISSION, cb);
};
const never = () => () => {};

/**
 * Notifications from this browser's side: whether it can get them, whether it does, the devices that do,
 * and which kinds of event ping. Both the Activity nudge and Settings use it.
 */
export function useNotifications() {
  const server = useApi<{ publicKey: string; prefs: Prefs; devices: DeviceRow[] }>("/api/dashboard/push");
  // Read in the browser only, so the server render and the first client render agree.
  const support = useSyncExternalStore<PushSupport | null>(never, pushSupport, () => null);
  const permission = useSyncExternalStore(onPermission, () => ("Notification" in window ? Notification.permission : null), () => null);
  const [mine, setMine] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // A switch flips at once; the server's answer replaces it.
  const [flipped, setFlipped] = useState<Partial<Prefs>>({});

  useEffect(() => {
    if (support !== "ok") return;
    currentSubscription()
      .then(async (sub) => setMine(sub ? await deviceId(sub.endpoint) : null))
      .catch(() => {});
  }, [support]);

  const devices = server.data?.devices ?? [];
  const on = Boolean(mine && devices.some((d) => d.id === mine));

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      window.dispatchEvent(new Event(PERMISSION));
    }
  }

  return {
    support,
    permission,
    on,
    mine,
    busy,
    devices,
    prefs: server.data ? { ...server.data.prefs, ...flipped } : null,
    loading: !server.data && !server.error,
    error: server.error,
    enable: () =>
      run(async () => {
        if (!server.data) throw new Error("Still loading. Try again in a moment.");
        const { id } = await turnOn(server.data.publicKey);
        setMine(id);
        await server.reload();
        toast.success("Notifications are on for this device.");
      }),
    disable: (id = mine) =>
      run(async () => {
        if (!id) return;
        await turnOff(id);
        if (id === mine) setMine(null);
        await server.reload();
      }),
    test: () =>
      run(async () => {
        const { sent } = await send<{ sent: number }>("/api/dashboard/push/test", "POST", { id: on ? mine : undefined });
        if (sent) toast.success(sent === 1 ? "Test sent. It should arrive in a few seconds." : `Test sent to ${sent} devices.`);
        else toast.error("No device took the test. Turn notifications on again on this device.");
      }),
    setPref: async (key: keyof Prefs, value: boolean) => {
      setFlipped((f) => ({ ...f, [key]: value }));
      await run(async () => {
        await send("/api/dashboard/push", "PATCH", { [key]: value });
        await server.reload();
      });
      setFlipped((f) => {
        const next = { ...f };
        delete next[key];
        return next;
      });
    },
  };
}
