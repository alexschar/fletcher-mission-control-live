"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthHeaders, isAuthenticated, logout } from "../../lib/api-client";

const PLATFORMS = ["all", "youtube", "twitter", "tiktok", "instagram", "web", "other"];
const CONTENT_TYPES = ["transcript", "caption", "article", "post", "other"];
const AGENTS = ["sawyer", "celeste", "fletcher"];

const PLATFORM_META = {
  youtube: { icon: "▶", label: "YouTube" },
  twitter: { icon: "𝕏", label: "Twitter" },
  tiktok: { icon: "♪", label: "TikTok" },
  instagram: { icon: "◎", label: "Instagram" },
  web: { icon: "↗", label: "Web" },
  other: { icon: "•", label: "Other" },
};

const INITIAL_MANUAL_FORM = {
  source_url: "",
  platform: "youtube",
  content_type: "transcript",
  title: "",
  raw_content: "",
};

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function truncate(value, max = 52) {
  if (!value) return "—";
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function normalizeTopics(value) {
  if (Array.isArray(value)) return value;
  return [];
}

function normalizeAgents(value) {
  if (Array.isArray(value)) return value;
  return [];
}

function buildDraft(item) {
  return {
    id: item.id,
    summary: item.summary || "",
    topicsText: normalizeTopics(item.topics).join(", "),
    relevant_agents: normalizeAgents(item.relevant_agents),
    processed: !!item.processed,
  };
}

function PlatformPill({ platform }) {
  const meta = PLATFORM_META[platform] || PLATFORM_META.other;
  return (
    <span className="content-platform-pill" title={meta.label}>
      <span>{meta.icon}</span>
      <span>{meta.label}</span>
    </span>
  );
}

function ProcessedBadge({ processed }) {
  return (
    <span className={`badge ${processed ? "badge-green" : "badge-blue"}`}>
      {processed ? "✓ Processed" : "• Unprocessed"}
    </span>
  );
}

function DetailPanel({ item, draft, saving, onClose, onChange, onToggleAgent, onSave, onToggleProcessed }) {
  if (!item || !draft) return null;

  return (
    <div className="content-overlay" onClick={onClose}>
      <div className="content-panel" onClick={(event) => event.stopPropagation()}>
        <div className="content-panel-header">
          <div>
            <div className="content-panel-kicker">Content Detail</div>
            <h2>{item.title || "Untitled drop"}</h2>
            <div className="content-panel-meta">
              <PlatformPill platform={item.platform} />
              <ProcessedBadge processed={draft.processed} />
              <span>{formatDate(item.created_at)}</span>
            </div>
          </div>
          <button className="btn" onClick={onClose}>Close</button>
        </div>

        <div className="content-panel-section">
          <div className="field-label">Source URL</div>
          <a href={item.source_url} target="_blank" rel="noreferrer">{item.source_url}</a>
        </div>

        <div className="content-panel-section">
          <div className="field-label">Summary</div>
          <textarea
            className="input content-textarea"
            value={draft.summary}
            onChange={(event) => onChange("summary", event.target.value)}
            placeholder="Add a concise summary"
          />
        </div>

        <div className="content-panel-section">
          <div className="field-label">Topics</div>
          <input
            className="input"
            value={draft.topicsText}
            onChange={(event) => onChange("topicsText", event.target.value)}
            placeholder="productivity, growth, automation"
          />
          <div className="field-help">Comma-separated tags.</div>
        </div>

        <div className="content-panel-section">
          <div className="field-label">Relevant agents</div>
          <div className="content-agent-grid">
            {AGENTS.map((agent) => (
              <label key={agent} className="content-checkbox-row">
                <input
                  type="checkbox"
                  checked={draft.relevant_agents.includes(agent)}
                  onChange={() => onToggleAgent(agent)}
                />
                <span>{agent}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="content-panel-section">
          <details open>
            <summary className="content-raw-summary">Raw content</summary>
            <div className="content-raw-box">{item.raw_content || "No raw content"}</div>
          </details>
        </div>

        <div className="content-panel-footer">
          <label className="content-checkbox-row">
            <input
              type="checkbox"
              checked={draft.processed}
              onChange={(event) => onToggleProcessed(event.target.checked)}
            />
            <span>Mark as processed</span>
          </label>
          <div className="content-panel-actions">
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={onSave} disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ManualAddModal({ form, submitting, onClose, onChange, onSubmit, error }) {
  return (
    <div className="content-overlay" onClick={onClose}>
      <div className="content-modal" onClick={(event) => event.stopPropagation()}>
        <div className="content-panel-header">
          <div>
            <div className="content-panel-kicker">Manual Add</div>
            <h2>Add content drop</h2>
          </div>
          <button className="btn" onClick={onClose}>Close</button>
        </div>

        <form className="content-form-grid" onSubmit={onSubmit}>
          <div className="content-form-field content-form-field-full">
            <label className="field-label">Source URL</label>
            <input className="input" value={form.source_url} onChange={(e) => onChange("source_url", e.target.value)} required />
          </div>
          <div className="content-form-field">
            <label className="field-label">Platform</label>
            <select className="select" value={form.platform} onChange={(e) => onChange("platform", e.target.value)} required>
              {PLATFORMS.filter((value) => value !== "all").map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </div>
          <div className="content-form-field">
            <label className="field-label">Content type</label>
            <select className="select" value={form.content_type} onChange={(e) => onChange("content_type", e.target.value)} required>
              {CONTENT_TYPES.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </div>
          <div className="content-form-field content-form-field-full">
            <label className="field-label">Title</label>
            <input className="input" value={form.title} onChange={(e) => onChange("title", e.target.value)} placeholder="Optional title" />
          </div>
          <div className="content-form-field content-form-field-full">
            <label className="field-label">Raw content</label>
            <textarea className="input content-textarea content-textarea-lg" value={form.raw_content} onChange={(e) => onChange("raw_content", e.target.value)} required />
          </div>
          {error ? <div className="content-error">{error}</div> : null}
          <div className="content-panel-actions content-form-actions">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? "Submitting..." : "Create drop"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ContentHubClient() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("inbox");
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [processedFilter, setProcessedFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailDraft, setDetailDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualForm, setManualForm] = useState(INITIAL_MANUAL_FORM);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualError, setManualError] = useState("");

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    loadContent();
  }, [router]);

  async function loadContent() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/content-drops?limit=50", { headers: getAuthHeaders() });
      if (res.status === 401) {
        logout();
        router.push("/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load content");
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load content");
    } finally {
      setLoading(false);
    }
  }

  const inboxItems = useMemo(() => items.filter((item) => !item.processed), [items]);

  const filteredItems = useMemo(() => {
    let next = [...items];
    if (platformFilter !== "all") next = next.filter((item) => item.platform === platformFilter);
    if (processedFilter !== "all") {
      const processed = processedFilter === "processed";
      next = next.filter((item) => !!item.processed === processed);
    }
    if (search.trim()) {
      const query = search.toLowerCase();
      next = next.filter((item) =>
        [item.title, item.raw_content, item.summary]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(query))
      );
    }
    next.sort((a, b) => {
      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      return sortOrder === "oldest" ? aTime - bTime : bTime - aTime;
    });
    return next;
  }, [items, platformFilter, processedFilter, search, sortOrder]);

  function openItem(item) {
    setSelectedItem(item);
    setDetailDraft(buildDraft(item));
  }

  function closeItem() {
    setSelectedItem(null);
    setDetailDraft(null);
  }

  function updateLocalItem(updated) {
    setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setSelectedItem(updated);
    setDetailDraft(buildDraft(updated));
  }

  async function patchItem(id, updates) {
    const res = await fetch(`/api/content-drops/${id}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    if (res.status === 401) {
      logout();
      router.push("/login");
      return null;
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to update content drop");
    return data;
  }

  async function handleQuickProcessed(item, processed) {
    try {
      const updated = await patchItem(item.id, { processed });
      if (updated) updateLocalItem(updated);
    } catch (err) {
      setError(err.message || "Failed to update item");
    }
  }

  async function handleSaveDetail() {
    if (!selectedItem || !detailDraft) return;
    setSaving(true);
    setError("");
    try {
      const topics = detailDraft.topicsText
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      const updated = await patchItem(selectedItem.id, {
        summary: detailDraft.summary,
        topics,
        relevant_agents: detailDraft.relevant_agents,
        processed: detailDraft.processed,
      });
      if (updated) updateLocalItem(updated);
    } catch (err) {
      setError(err.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  async function handleManualAddSubmit(event) {
    event.preventDefault();
    setManualSubmitting(true);
    setManualError("");
    try {
      const res = await fetch("/api/content-drops", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...manualForm,
          title: manualForm.title.trim() || null,
          raw_content: manualForm.raw_content.trim(),
        }),
      });
      if (res.status === 401) {
        logout();
        router.push("/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create content drop");
      setItems((current) => [data, ...current]);
      setManualForm(INITIAL_MANUAL_FORM);
      setShowManualAdd(false);
      setActiveTab("inbox");
    } catch (err) {
      setManualError(err.message || "Failed to create content drop");
    } finally {
      setManualSubmitting(false);
    }
  }

  return (
    <div>
      <div className="page-header content-header">
        <div>
          <h1>Content Hub</h1>
          <p>Shared dashboard for processing, reviewing, and adding content drops.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowManualAdd(true)}>+ Manual Add</button>
      </div>

      {error ? <div className="card content-error-banner">{error}</div> : null}

      <div className="content-tab-row">
        <button className={`content-tab ${activeTab === "inbox" ? "active" : ""}`} onClick={() => setActiveTab("inbox")}>Inbox <span>{inboxItems.length}</span></button>
        <button className={`content-tab ${activeTab === "all" ? "active" : ""}`} onClick={() => setActiveTab("all")}>All Content <span>{items.length}</span></button>
      </div>

      {activeTab === "inbox" ? (
        <div className="card">
          <div className="card-header">Unprocessed Queue</div>
          {loading ? (
            <div className="empty">Loading content…</div>
          ) : inboxItems.length === 0 ? (
            <div className="empty">No unprocessed items</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Platform</th>
                    <th>Title</th>
                    <th>Source URL</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inboxItems.map((item) => (
                    <tr key={item.id}>
                      <td><PlatformPill platform={item.platform} /></td>
                      <td>{item.title || "Untitled drop"}</td>
                      <td><a href={item.source_url} target="_blank" rel="noreferrer">{truncate(item.source_url)}</a></td>
                      <td>{formatDate(item.created_at)}</td>
                      <td>
                        <div className="content-row-actions">
                          <button className="btn btn-sm" onClick={() => openItem(item)}>Process</button>
                          <label className="content-checkbox-row compact">
                            <input type="checkbox" checked={!!item.processed} onChange={(e) => handleQuickProcessed(item, e.target.checked)} />
                            <span>Mark processed</span>
                          </label>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="card filters-card">
            <div className="filters-row">
              <div className="filter-group" style={{ minWidth: 260 }}>
                <label>Search</label>
                <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, raw content, summary" />
              </div>
              <div className="filter-group">
                <label>Platform</label>
                <select className="select" value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}>
                  {PLATFORMS.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </div>
              <div className="filter-group">
                <label>Status</label>
                <select className="select" value={processedFilter} onChange={(e) => setProcessedFilter(e.target.value)}>
                  <option value="all">all</option>
                  <option value="processed">processed</option>
                  <option value="unprocessed">unprocessed</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Sort</label>
                <select className="select" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                  <option value="newest">newest first</option>
                  <option value="oldest">oldest first</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="card empty">Loading content…</div>
          ) : filteredItems.length === 0 ? (
            <div className="card empty">No content matches your filters</div>
          ) : (
            <div className="content-card-grid">
              {filteredItems.map((item) => (
                <button key={item.id} className="content-card" onClick={() => openItem(item)}>
                  <div className="content-card-top">
                    <PlatformPill platform={item.platform} />
                    <ProcessedBadge processed={!!item.processed} />
                  </div>
                  <div className="content-card-title">{item.title || "Untitled drop"}</div>
                  <div className="content-card-summary">{item.summary?.trim() || "No summary yet"}</div>
                  <div className="content-card-footer">
                    <span>{formatDate(item.created_at)}</span>
                    <span>{truncate(item.source_url, 28)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <DetailPanel
        item={selectedItem}
        draft={detailDraft}
        saving={saving}
        onClose={closeItem}
        onChange={(field, value) => setDetailDraft((current) => ({ ...current, [field]: value }))}
        onToggleAgent={(agent) => setDetailDraft((current) => ({
          ...current,
          relevant_agents: current.relevant_agents.includes(agent)
            ? current.relevant_agents.filter((entry) => entry !== agent)
            : [...current.relevant_agents, agent],
        }))}
        onToggleProcessed={(processed) => setDetailDraft((current) => ({ ...current, processed }))}
        onSave={handleSaveDetail}
      />

      {showManualAdd ? (
        <ManualAddModal
          form={manualForm}
          submitting={manualSubmitting}
          error={manualError}
          onClose={() => {
            setShowManualAdd(false);
            setManualError("");
          }}
          onChange={(field, value) => setManualForm((current) => ({ ...current, [field]: value }))}
          onSubmit={handleManualAddSubmit}
        />
      ) : null}
    </div>
  );
}
