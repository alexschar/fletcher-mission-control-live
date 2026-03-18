"use client";
import { useState, useEffect } from "react";
import { getAuthHeaders, isAuthenticated, logout } from "../../lib/api-client";
import { useRouter } from "next/navigation";

const OUTCOMES = ["all", "verified", "denied", "blocked"];
const TIERS = ["all", "1", "2", "3"];

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
}

function getOutcomeColor(outcome) {
  switch (outcome) {
    case "verified": return "var(--green)";
    case "denied": return "var(--yellow)";
    case "blocked": return "var(--red)";
    default: return "var(--text-muted)";
  }
}

function getTierBadgeClass(tier) {
  switch (tier) {
    case "1": return "tier-badge tier-1";
    case "2": return "tier-badge tier-2";
    case "3": return "tier-badge tier-3";
    default: return "tier-badge";
  }
}

export default function OverridesPage() {
  const [overrides, setOverrides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [outcomeFilter, setOutcomeFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchOverrides();
  }, [router]);

  async function fetchOverrides() {
    setLoading(true);
    try {
      const res = await fetch("/api/overrides", { headers: getAuthHeaders() });
      if (res.status === 401) {
        logout();
        router.push('/login');
        return;
      }
      const data = await res.json();
      setOverrides(data || []);
    } catch (err) {
      console.error("Failed to fetch overrides:", err);
    } finally {
      setLoading(false);
    }
  }

  // Filter overrides
  const filteredOverrides = overrides.filter(o => {
    if (outcomeFilter !== "all" && o.outcome !== outcomeFilter) return false;
    if (tierFilter !== "all" && String(o.tier) !== tierFilter) return false;
    if (startDate) {
      const overrideDate = new Date(o.created_at);
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (overrideDate < start) return false;
    }
    if (endDate) {
      const overrideDate = new Date(o.created_at);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (overrideDate > end) return false;
    }
    return true;
  });

  // Sort by created_at descending (reverse chronological)
  const sortedOverrides = [...filteredOverrides].sort((a, b) => 
    new Date(b.created_at) - new Date(a.created_at)
  );

  function clearFilters() {
    setOutcomeFilter("all");
    setTierFilter("all");
    setStartDate("");
    setEndDate("");
  }

  const hasFilters = outcomeFilter !== "all" || tierFilter !== "all" || startDate || endDate;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Override Log</h1>
          <p>Audit trail of override decisions</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card filters-card">
        <div className="filters-row">
          <div className="filter-group">
            <label>Outcome</label>
            <select 
              className="select" 
              value={outcomeFilter} 
              onChange={(e) => setOutcomeFilter(e.target.value)}
            >
              {OUTCOMES.map(o => (
                <option key={o} value={o}>
                  {o === "all" ? "All Outcomes" : o.charAt(0).toUpperCase() + o.slice(1)}
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label>Tier</label>
            <select 
              className="select" 
              value={tierFilter} 
              onChange={(e) => setTierFilter(e.target.value)}
            >
              {TIERS.map(t => (
                <option key={t} value={t}>
                  {t === "all" ? "All Tiers" : `Tier ${t}`}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Start Date</label>
            <input 
              className="input" 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>End Date</label>
            <input 
              className="input" 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {hasFilters && (
            <div className="filter-group filter-group-btn">
              <label>&nbsp;</label>
              <button className="btn btn-secondary" onClick={clearFilters}>
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Results count */}
      <div className="results-count">
        {sortedOverrides.length} override{sortedOverrides.length !== 1 ? 's' : ''} found
        {outcomeFilter !== "all" && ` with outcome "${outcomeFilter}"`}
        {tierFilter !== "all" && ` from Tier ${tierFilter}`}
        {startDate && ` from ${startDate}`}
        {endDate && ` until ${endDate}`}
      </div>

      {/* Overrides list */}
      {loading ? (
        <div className="loading">Loading overrides...</div>
      ) : sortedOverrides.length === 0 ? (
        <div className="card empty-card">
          <p>No overrides found</p>
          {hasFilters && <p className="empty-hint">Try adjusting your filters</p>}
        </div>
      ) : (
        <div className="overrides-list">
          {sortedOverrides.map(o => (
            <div key={o.id} className="card override-card">
              <div className="override-header">
                <div className="override-meta">
                  <span className="override-timestamp">{formatDate(o.created_at)}</span>
                  <span className={getTierBadgeClass(o.tier)}>Tier {o.tier}</span>
                  <span className="risk-badge">Risk: {o.risk_level || "N/A"}</span>
                </div>
                <span 
                  className="outcome-badge"
                  style={{ background: getOutcomeColor(o.outcome) }}
                >
                  {o.outcome}
                </span>
              </div>
              <div className="override-body">
                <p className="override-description">{o.task_description || "No description"}</p>
                {o.details && (
                  <p className="override-details">{o.details}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
