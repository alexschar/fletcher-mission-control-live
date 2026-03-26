"use client";
import { useState, useEffect } from "react";
import {
  useTimeSince,
  getNotificationsEnabled,
  setNotificationsEnabled,
  onNotificationToggle,
} from "../../lib/use-live-polling";

/**
 * Live header bar with "Last refreshed" counter, new signal toast, and notification toggle.
 */
export default function LiveHeader({ lastRefreshed, newCount, onClickNew }) {
  const timeAgo = useTimeSince(lastRefreshed);
  const [notifOn, setNotifOn] = useState(false);

  useEffect(() => {
    setNotifOn(getNotificationsEnabled());
    const unsub = onNotificationToggle(setNotifOn);
    return unsub;
  }, []);

  function toggleNotif() {
    const next = !notifOn;
    setNotificationsEnabled(next);
    setNotifOn(next);
    // Request browser notification permission
    if (next && typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }

  return (
    <div className="live-header">
      <div className="live-header-left">
        {lastRefreshed && (
          <span className="live-header-freshness">
            <span className="live-pulse" />
            Last refreshed: {timeAgo}
          </span>
        )}
        {newCount > 0 && (
          <button className="live-new-toast" onClick={onClickNew}>
            {newCount} new signal{newCount > 1 ? "s" : ""}
            <span className="live-new-arrow">{"\u2191"}</span>
          </button>
        )}
      </div>
      <button
        className={`live-notif-toggle ${notifOn ? "active" : ""}`}
        onClick={toggleNotif}
        title={notifOn ? "Notifications ON" : "Notifications OFF"}
      >
        {notifOn ? "\uD83D\uDD14" : "\uD83D\uDD15"} {notifOn ? "ON" : "OFF"}
      </button>
    </div>
  );
}
