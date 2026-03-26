"use client";
import { useEffect, useState, useCallback, useRef } from "react";

/**
 * Hook for live polling with new-signal detection, freshness tracking,
 * and optional browser notifications.
 *
 * @param {Function} fetchFn - async function that returns an array of signals (must have .id and .created_at)
 * @param {Object} opts
 * @param {number} opts.interval - polling interval in ms (default 30000)
 * @param {string} opts.idField - field name for unique ID (default "id")
 * @returns {{ data, loading, error, newCount, clearNew, lastRefreshed, refreshNow }}
 */
export function useLivePolling(fetchFn, opts = {}) {
  const { interval = 30000, idField = "id" } = opts;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newIds, setNewIds] = useState(new Set());
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const knownIdsRef = useRef(new Set());
  const isFirstFetch = useRef(true);

  const doFetch = useCallback(async () => {
    try {
      const result = await fetchFn();
      const items = Array.isArray(result) ? result : [];

      // Detect new signals (skip on first fetch)
      if (!isFirstFetch.current && items.length > 0) {
        const incoming = new Set(items.map((i) => i[idField]));
        const freshIds = new Set();
        for (const id of incoming) {
          if (!knownIdsRef.current.has(id)) freshIds.add(id);
        }
        if (freshIds.size > 0) {
          setNewIds((prev) => new Set([...prev, ...freshIds]));
          // Check for high-priority — trigger notification
          const highPri = items.filter(
            (i) => freshIds.has(i[idField]) && (i.priority === "urgent" || i.priority === "high")
          );
          if (highPri.length > 0) {
            triggerNotification(highPri);
          }
        }
      }

      // Update known IDs
      knownIdsRef.current = new Set(items.map((i) => i[idField]));
      isFirstFetch.current = false;

      setData(items);
      setError(null);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Polling error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchFn, idField]);

  useEffect(() => {
    doFetch();
    const timer = setInterval(doFetch, interval);
    return () => clearInterval(timer);
  }, [doFetch, interval]);

  const clearNew = useCallback(() => setNewIds(new Set()), []);
  const refreshNow = useCallback(() => doFetch(), [doFetch]);

  return {
    data,
    loading,
    error,
    newIds,
    newCount: newIds.size,
    clearNew,
    lastRefreshed,
    refreshNow,
    isNew: (id) => newIds.has(id),
  };
}

/**
 * Hook for the "Xs ago" live counter.
 */
export function useTimeSince(date) {
  const [text, setText] = useState("");

  useEffect(() => {
    function update() {
      if (!date) { setText(""); return; }
      const diff = Math.floor((Date.now() - date.getTime()) / 1000);
      if (diff < 5) setText("just now");
      else if (diff < 60) setText(`${diff}s ago`);
      else if (diff < 3600) setText(`${Math.floor(diff / 60)}m ago`);
      else setText(`${Math.floor(diff / 3600)}h ago`);
    }
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [date]);

  return text;
}

/**
 * Pipeline freshness from latest signal timestamp.
 * Returns "green" | "yellow" | "red"
 */
export function usePipelineFreshness(latestTimestamp) {
  const [freshness, setFreshness] = useState("green");

  useEffect(() => {
    function check() {
      if (!latestTimestamp) { setFreshness("red"); return; }
      const age = Date.now() - new Date(latestTimestamp).getTime();
      if (age < 30 * 60 * 1000) setFreshness("green");
      else if (age < 6 * 3600 * 1000) setFreshness("yellow");
      else setFreshness("red");
    }
    check();
    const timer = setInterval(check, 30000);
    return () => clearInterval(timer);
  }, [latestTimestamp]);

  return freshness;
}

// Notification toggle helpers (use in-memory since localStorage not available in artifacts)
let _notificationsOn = false;
const _listeners = new Set();

export function getNotificationsEnabled() {
  if (typeof window !== "undefined") {
    try { return window.__mc_notifications === true; } catch { return false; }
  }
  return false;
}

export function setNotificationsEnabled(val) {
  if (typeof window !== "undefined") {
    window.__mc_notifications = val;
    _notificationsOn = val;
    _listeners.forEach((fn) => fn(val));
  }
}

export function onNotificationToggle(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

function triggerNotification(signals) {
  if (!getNotificationsEnabled()) return;
  if (typeof window === "undefined") return;

  // Browser notification
  if ("Notification" in window && Notification.permission === "granted") {
    const titles = signals.map((s) => s.title).slice(0, 3).join(", ");
    new Notification("Mission Control", {
      body: `${signals.length} high-priority signal${signals.length > 1 ? "s" : ""}: ${titles}`,
      icon: "/favicon.ico",
      tag: "mc-alert",
    });
  }

  // Audio chime
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.value = 0.08;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Audio not available
  }
}
