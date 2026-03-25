"use client";
import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders, isAuthenticated, logout } from "../../lib/api-client";
import { useRouter } from "next/navigation";
import { CostsSummarySkeleton, CostsTableSkeleton } from "../components/Skeleton";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "api", label: "API Costs" },
  { key: "subscriptions", label: "Subscriptions" },
  { key: "shopping", label: "Shopping" },
];

function formatCurrency(n) {
  if (n == null) return "$0.00";
  return `$${Number(n).toFixed(2)}`;
}

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function SubscriptionCard({ signal }) {
  const meta = signal.metadata || {};
  const amount = meta.amount || meta.price || meta.charge_amount;
  const service = meta.service_name || signal.title;
  const frequency = meta.frequency || "monthly";
  const prevAmount = meta.prev_amount;
  const priceChange = amount && prevAmount && amount !== prevAmount;

  return (
    <div className="card spending-sub-card">
      <div className="spending-sub-row">
        <div className="spending-sub-main">
          <div className="spending-sub-name">{service}</div>
          <div className="spending-sub-freq">{frequency}</div>
          {signal.agent_notes?.reason && <div className="spending-sub-note">{signal.agent_notes.reason}</div>}
        </div>
        <div className="spending-sub-amount">
          {amount != null && <span className="spending-amount">{formatCurrency(amount)}</span>}
          {priceChange && (
            <span className={`spending-delta ${amount > prevAmount ? "negative" : "positive"}`}>
              was {formatCurrency(prevAmount)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ShoppingCard({ signal }) {
  const meta = signal.metadata || {};
  const amount = meta.amount || meta.order_total || meta.price;
  const store = meta.store || meta.merchant || signal.source;
  const items = meta.items || [];
  const tracking = meta.tracking_number;
  const status = meta.delivery_status || signal.signal_type?.replace(/_/g, " ");

  return (
    <div className="card spending-shop-card">
      <div className="spending-shop-row">
        <div className="spending-shop-main">
          <div className="spending-shop-title">{signal.title}</div>
          <div className="spending-shop-meta">
            <span className="spending-shop-store">{store}</span>
            <span className="spending-shop-time">{formatTime(signal.created_at)}</span>
            {status && <span className="spending-shop-status">{status}</span>}
          </div>
          {items.length > 0 && (
            <div className="spending-shop-items">{items.join(", ")}</div>
          )}
          {signal.agent_notes?.reason && <div className="spending-shop-note">{signal.agent_notes.reason}</div>}
        </div>
        <div className="spending-shop-amount">
          {amount != null && <span className="spending-amount">{formatCurrency(amount)}</span>}
        </div>
      </div>
    </div>
  );
}

export default function CostsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [shoppingSignals, setShoppingSignals] = useState([]);
  const [financeSignals, setFinanceSignals] = useState([]);
  const [spendingLoading, setSpendingLoading] = useState(true);
  const router = useRouter();

  // Fetch API costs (existing)
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    fetch("/api/costs", { headers: getAuthHeaders() })
      .then((r) => (r.ok ? r.json() : r.status === 401 ? (logout(), router.push("/login")) : {}))
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [router]);

  // Fetch shopping + finance life_signals
  const fetchSpending = useCallback(async () => {
    try {
      const [shopRes, finRes] = await Promise.all([
        fetch("/api/life-signals?category=shopping&limit=50", { headers: getAuthHeaders() }),
        fetch("/api/life-signals?category=finance&limit=50", { headers: getAuthHeaders() }),
      ]);
      if (shopRes.ok) {
        const d = await shopRes.json();
        setShoppingSignals(Array.isArray(d) ? d : []);
      }
      if (finRes.ok) {
        const d = await finRes.json();
        setFinanceSignals(Array.isArray(d) ? d : []);
      }
    } catch (err) {
      console.error("Failed to load spending signals:", err);
    } finally {
      setSpendingLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSpending();
  }, [fetchSpending]);

  const dailyTotal = data?.dailyTotal ?? 0;
  const monthlyTotal = data?.monthlyTotal ?? 0;
  const entries = data?.entries ?? [];
  const alertLevel = monthlyTotal > 50 ? "red" : monthlyTotal > 20 ? "yellow" : "green";

  // Compute subscription + shopping totals from signals
  const subscriptions = financeSignals.filter((s) => s.signal_type === "subscription" || s.signal_type === "recurring_charge");
  const purchases = shoppingSignals;
  const subTotal = subscriptions.reduce((sum, s) => sum + (s.metadata?.amount || s.metadata?.price || 0), 0);
  const shopTotal = purchases.reduce((sum, s) => sum + (s.metadata?.amount || s.metadata?.order_total || s.metadata?.price || 0), 0);
  const totalSpending = monthlyTotal + subTotal + shopTotal;

  return (
    <div>
      <div className="page-header page-header-row">
        <div>
          <h1>Spending</h1>
          <p>API costs, subscriptions, and purchase tracking</p>
        </div>
        <div className="life-feed-stats">
          <span className="stat-pill">{formatCurrency(totalSpending)} total</span>
          <span className="stat-pill">{subscriptions.length} subs</span>
          <span className="stat-pill">{purchases.length} orders</span>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="life-feed-filters">
        <div className="filter-chips">
          {TABS.map((t) => (
            <button key={t.key} className={`chip ${tab === t.key ? "chip-active" : ""}`} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading && spendingLoading ? (
        <>
          <CostsSummarySkeleton />
          <CostsTableSkeleton />
        </>
      ) : (
        <>
          {/* Overview tab */}
          {tab === "overview" && (
            <>
              <div className="grid-3">
                <div className="card">
                  <div className="card-header">API Costs (Month)</div>
                  <div className={`card-value ${alertLevel}`}>{formatCurrency(monthlyTotal)}</div>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Target: $30/month</p>
                </div>
                <div className="card">
                  <div className="card-header">Subscriptions (Month)</div>
                  <div className="card-value">{formatCurrency(subTotal)}</div>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{subscriptions.length} active services</p>
                </div>
                <div className="card">
                  <div className="card-header">Shopping (Month)</div>
                  <div className="card-value">{formatCurrency(shopTotal)}</div>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{purchases.length} orders</p>
                </div>
              </div>

              <div className="card spending-total-card">
                <div className="spending-total-row">
                  <span className="spending-total-label">Total Monthly Spending</span>
                  <span className="spending-total-value">{formatCurrency(totalSpending)}</span>
                </div>
              </div>

              {/* Agent insights from spending signals */}
              {[...financeSignals, ...shoppingSignals].filter((s) => s.agent_notes?.reason).slice(0, 3).map((s) => (
                <div key={s.id} className="card spending-insight-card">
                  <div className="spending-insight-text">{s.agent_notes.reason}</div>
                </div>
              ))}
            </>
          )}

          {/* API Costs tab */}
          {tab === "api" && (
            <>
              <div className="grid-3">
                <div className="card">
                  <div className="card-header">Today</div>
                  <div className={`card-value ${dailyTotal > 5 ? "red" : "green"}`}>{formatCurrency(dailyTotal)}</div>
                </div>
                <div className="card">
                  <div className="card-header">This Month</div>
                  <div className={`card-value ${alertLevel}`}>{formatCurrency(monthlyTotal)}</div>
                </div>
                <div className="card">
                  <div className="card-header">Budget Status</div>
                  <div style={{ marginTop: 8 }}>
                    <span className={`badge badge-${alertLevel}`}>
                      {alertLevel === "green" ? "On Track" : alertLevel === "yellow" ? "Watch" : "Over Budget"}
                    </span>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>Target: $30/month</p>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="card-header">Recent API Calls</div>
                {entries.length > 0 ? (
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Time</th><th>Provider</th><th>Model</th><th>Cost</th></tr></thead>
                      <tbody>
                        {entries.slice(0, 15).map((e, i) => (
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
            </>
          )}

          {/* Subscriptions tab */}
          {tab === "subscriptions" && (
            <>
              {subscriptions.length > 0 ? (
                <div className="section-stack">
                  {subscriptions.map((s) => <SubscriptionCard key={s.id} signal={s} />)}
                </div>
              ) : (
                <div className="card empty-card">
                  <p className="empty">No subscription signals yet</p>
                  <p className="empty-hint">
                    Subscription charges will be detected from billing emails once the Gmail fetcher is running.
                    Recurring charges from Spotify, Adobe, iCloud, etc. will appear here.
                  </p>
                </div>
              )}
            </>
          )}

          {/* Shopping tab */}
          {tab === "shopping" && (
            <>
              {purchases.length > 0 ? (
                <div className="section-stack">
                  {purchases.map((s) => <ShoppingCard key={s.id} signal={s} />)}
                </div>
              ) : (
                <div className="card empty-card">
                  <p className="empty">No shopping signals yet</p>
                  <p className="empty-hint">
                    Amazon orders, shipping notifications, and other e-commerce purchases will appear here
                    once email parsing detects them.
                  </p>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
