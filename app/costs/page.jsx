"use client";
import { useState, useEffect } from "react";
import { getAuthHeaders, isAuthenticated, logout } from "../../lib/api-client";
import { useRouter } from "next/navigation";
import { CostsSummarySkeleton, CostsTableSkeleton } from "../components/Skeleton";

export default function CostsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetch("/api/costs", { headers: getAuthHeaders() })
      .then(r => r.ok ? r.json() : (r.status === 401 ? (logout(), router.push('/login')) : {}))
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [router]);

  const dailyTotal = data?.dailyTotal ?? 0;
  const monthlyTotal = data?.monthlyTotal ?? 0;
  const entries = data?.entries ?? [];

  const alertLevel = monthlyTotal > 50 ? "red" : monthlyTotal > 20 ? "yellow" : "green";

  return (
    <div>
      <div className="page-header">
        <h1>Cost Tracker</h1>
        <p>API spend monitoring and budget alerts</p>
      </div>

      {loading ? (
        <>
          <CostsSummarySkeleton />
          <CostsTableSkeleton />
        </>
      ) : (
        <>
          <div className="grid-3">
            <div className="card">
              <div className="card-header">Today</div>
              <div className={`card-value ${dailyTotal > 5 ? "red" : "green"}`}>
                ${dailyTotal.toFixed(4)}
              </div>
            </div>
            <div className="card">
              <div className="card-header">This Month</div>
              <div className={`card-value ${alertLevel}`}>
                ${monthlyTotal.toFixed(2)}
              </div>
            </div>
            <div className="card">
              <div className="card-header">Budget Status</div>
              <div style={{ marginTop: 8 }}>
                <span className={`badge badge-${alertLevel}`}>
                  {alertLevel === "green" ? "On Track" : alertLevel === "yellow" ? "Watch" : "Over Budget"}
                </span>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
                  Target: $30/month
                </p>
              </div>
            </div>
          </div>

          <div className="grid-2">
            <div className="card">
              <div className="card-header">Recent API Calls</div>
              {entries.length > 0 ? (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Time</th><th>Provider</th><th>Model</th><th>Cost</th></tr></thead>
                    <tbody>
                      {entries.slice(0, 10).map((e, i) => (
                        <tr key={i}>
                          <td>{(e.timestamp || e.created_at) ? new Date(e.timestamp || e.created_at).toLocaleTimeString() : "-"}</td>
                          <td>{e.agent || e.provider || "-"}</td>
                          <td style={{ fontFamily: "monospace", fontSize: 12 }}>{e.model || "-"}</td>
                          <td style={{ fontFamily: "monospace", whiteSpace: "nowrap" }}>
                            ${Number(e.calculated_cost || e.cost_est || 0).toFixed(6)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty">No entries yet</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
