"use client";

import { useCallback, useEffect, useState } from "react";

/** A dashboard API call. A lapsed session reloads the page, which then shows the sign-in form. */
export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const body = await res.json().catch(() => ({}));
  if (res.status === 401) {
    location.reload();
    throw new Error("Signed out.");
  }
  if (!res.ok) throw new Error(body.error ?? `Something went wrong (${res.status}). Try again.`);
  return body as T;
}

export const send = <T = unknown>(url: string, method: string, body?: unknown) =>
  api<T>(url, { method, body: body === undefined ? undefined : JSON.stringify(body) });

/** Loads once, again on `reload()`, and again whenever the app comes back on screen. */
export function useApi<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api<T>(url));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the first load, then on every return to the app
    reload();
    const onShow = () => {
      if (document.visibilityState === "visible") reload();
    };
    document.addEventListener("visibilitychange", onShow);
    return () => document.removeEventListener("visibilitychange", onShow);
  }, [reload]);

  return { data, error, loading, reload };
}
