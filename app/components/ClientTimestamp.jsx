"use client";
import { useEffect, useState } from "react";

export default function ClientTimestamp({
  value,
  formatter,
  fallback = "",
}) {
  const [formatted, setFormatted] = useState("");

  useEffect(() => {
    if (!value) {
      setFormatted(fallback);
      return;
    }

    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        setFormatted(fallback);
        return;
      }
      setFormatted(formatter ? formatter(date) : date.toLocaleString());
    } catch {
      setFormatted(fallback);
    }
  }, [value, formatter, fallback]);

  return <>{formatted}</>;
}
