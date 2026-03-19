"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ContentList from "../../components/content/ContentList";
import ContentDetail from "../../components/content/ContentDetail";
import AddContentModal from "../../components/content/AddContentModal";
import { getAuthHeaders, getAuthToken, isAuthenticated, logout } from "../../lib/api-client";
import { useToast } from "../components/ToastProvider";

export default function ContentPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("inbox");
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [processedFilter, setProcessedFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
  }, [router]);

  useEffect(() => {
    fetchContent();
  }, [activeTab, searchQuery, platformFilter, processedFilter]);

  async function fetchContent() {
    setLoading(true);
    setError("");

    const params = new URLSearchParams();
    params.set("limit", "50");

    if (activeTab === "inbox") {
      params.set("processed", "false");
    } else {
      if (platformFilter) params.set("platform", platformFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (processedFilter === "processed") params.set("processed", "true");
      if (processedFilter === "unprocessed") params.set("processed", "false");
    }

    try {
      const response = await fetch(`/api/content-drops?${params.toString()}`, {
        headers: getAuthHeaders(),
      });

      if (response.status === 401) {
        logout();
        router.push("/login");
        return;
      }

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load content drops");

      let nextItems = Array.isArray(data) ? data : [];
      if (activeTab === "all" && searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        nextItems = nextItems.filter((item) =>
          [item.title, item.raw_content, item.summary, item.source_url]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(query))
        );
      }

      setItems(nextItems);
    } catch (err) {
      setError(err.message || "Failed to load content drops");
    } finally {
      setLoading(false);
    }
  }

  const inboxCount = useMemo(() => items.filter((item) => !item.processed).length, [items]);

  async function patchContentDrop(id, payload) {
    const response = await fetch(`/api/content-drops/${id}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (response.status === 401) {
      logout();
      router.push("/login");
      return null;
    }

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to update content drop");
    return data;
  }

  async function handleToggleProcessed(id, checked) {
    try {
      const updated = await patchContentDrop(id, { processed: checked });
      if (!updated) return;
      setItems((current) => current.map((item) => (item.id === id ? updated : item)));
      if (selectedItem?.id === id) setSelectedItem(updated);
      toast.success(`Content ${checked ? 'marked processed' : 'marked unprocessed'}`);
    } catch (err) {
      setError(err.message || "Failed to update content drop");
      toast.error(err.message || 'Failed to update content drop');
    }
  }

  async function handleSaveDetail(payload) {
    if (!selectedItem) return;
    const updated = await patchContentDrop(selectedItem.id, payload);
    if (!updated) return;
    setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setSelectedItem(updated);
    if (activeTab === "inbox" && updated.processed) {
      setItems((current) => current.filter((item) => item.id !== updated.id));
      setSelectedItem(updated);
    }
    toast.success('Content drop updated');
  }

  async function handleAddContent(payload) {
    const response = await fetch("/api/content-drops", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (response.status === 401) {
      logout();
      router.push("/login");
      return;
    }

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to create content drop");

    setItems((current) => [data, ...current]);
    setShowAddModal(false);
    setActiveTab("inbox");
    toast.success('Content drop created');
  }

  return (
    <div className="content-page-shell">
      <div className="page-header">
        <div className="page-header-row content-header">
          <div>
            <h1>Content Hub</h1>
            <p>Review inbound content drops and manually add new ones.</p>
          </div>
          <div className="page-header-actions">
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>Add Content</button>
          </div>
        </div>
      </div>

      {error ? <div className="card content-error-banner">{error}</div> : null}

      <div className="content-tab-row">
        <button className={`content-tab ${activeTab === "inbox" ? "active" : ""}`} onClick={() => setActiveTab("inbox")}>
          Inbox <span>{activeTab === "inbox" ? items.length : inboxCount}</span>
        </button>
        <button className={`content-tab ${activeTab === "all" ? "active" : ""}`} onClick={() => setActiveTab("all")}>
          All Content <span>{activeTab === "all" ? items.length : ""}</span>
        </button>
      </div>

      {activeTab === "all" ? (
        <div className="card content-filters-card" style={{ marginBottom: 16 }}>
          <div className="filters-row">
            <div className="filter-group">
              <label>Search</label>
              <input className="input" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search title, content, summary" />
            </div>
            <div className="filter-group">
              <label>Platform</label>
              <input className="input" value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value)} placeholder="youtube / twitter / web" />
            </div>
            <div className="filter-group">
              <label>Status</label>
              <select className="input" value={processedFilter} onChange={(event) => setProcessedFilter(event.target.value)}>
                <option value="all">all</option>
                <option value="processed">processed</option>
                <option value="unprocessed">unprocessed</option>
              </select>
            </div>
          </div>
        </div>
      ) : null}

      <div className="card content-list-card">
        <div className="card-header">
          {activeTab === "inbox" ? "Unprocessed Queue" : "All Content"}
        </div>
        {loading ? (
          <div className="empty">Loading content…</div>
        ) : (
          <ContentList items={items} onSelect={setSelectedItem} onToggleProcessed={handleToggleProcessed} />
        )}
      </div>

      {selectedItem ? (
        <ContentDetail
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onSave={handleSaveDetail}
        />
      ) : null}

      {showAddModal ? (
        <AddContentModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddContent}
        />
      ) : null}
    </div>
  );
}
