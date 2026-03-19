"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAuthToken } from "../../lib/api-client";

export default function AuthGate({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const isLoginPage = pathname === "/login";
    const token = getAuthToken();
    const currentPath = typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : pathname;

    if (!token && !isLoginPage) {
      router.replace(`/login?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }

    if (token && isLoginPage) {
      const redirect = typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("redirect") || "/agents"
        : "/agents";
      router.replace(redirect);
      return;
    }

    setReady(true);
  }, [pathname, router]);

  if (!ready) {
    return (
      <div style={{ padding: "24px", color: "var(--text-muted)" }}>
        Checking authentication...
      </div>
    );
  }

  return children;
}
