"use client";
import { useState, useEffect } from "react";
import { getAuthHeaders, isAuthenticated, logout } from "../../lib/api-client";
import { useRouter } from "next/navigation";

const AGENTS = [
  { id: 'all', label: 'All Agents' },
  { id: 'fletcher', label: 'Fletcher' },
  { id: 'sawyer', label: 'Sawyer' },
  { id: 'celeste', label: 'Celeste' },
  { id: 'system', label: 'System' }
];

export default function MemoryPage() {
  const [files, setFiles] = useState([]);
  const [search, setSearch] = useState("");
  const [agentFilter, setAgentFilter] = useState("all");
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    const url = agentFilter === 'all' 
      ? "/api/memory" 
      : `/api/memory?agent=${agentFilter}`;
    fetch(url, { headers: getAuthHeaders() })
      .then(r => r.ok ? r.json() : (r.status === 401 ? (logout(), router.push('/login')) : []))
      .then(d => { setFiles(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [router, agentFilter]);

  function toggle(name) {
    setExpanded(prev => ({ ...prev, [name]: !prev[name] }));
  }

  const filtered = files.filter(f => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return f.name?.toLowerCase().includes(q) || (f.content && f.content.toLowerCase().includes(q));
  });

  const agentFiles = filtered.filter(f => f.agent && f.agent !== 'system');
  const systemFiles = filtered.filter(f => !f.agent || f.agent === 'system');

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    return (bytes / 1024).toFixed(1) + " KB";
  }

  function formatDate(d) {
    if (!d) return "";
    return new Date(d).toLocaleString();
  }

  return (
    <div>
      <div className="page-header">
        <h1>Memory Viewer</h1>
        <p>Browse Fletcher's workspace and memory files</p>
      </div>

      <div className="search-bar form-inline">
        <div className="form-field-grow">
          <input
            className="input"
            placeholder="Search files and content..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select 
          className="input" 
          value={agentFilter} 
          onChange={e => setAgentFilter(e.target.value)}
        >
          {AGENTS.map(a => (
            <option key={a.id} value={a.id}>{a.label}</option>
          ))}
        </select>
      </div>

      {loading && <div className="empty">Loading memory files...</div>}

      {!loading && filtered.length === 0 && !search && (
        <div className="empty">
          <p>No memory files found.</p>
          <p style={{ fontSize: 12, marginTop: 8, color: "var(--text-muted)" }}>
            Memory files are synced to Supabase and shared across all agents.
          </p>
        </div>
      )}
      {!loading && filtered.length === 0 && search && (
        <div className="empty">No files match your search</div>
      )}

      {agentFiles.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-muted)", marginBottom: 12 }}>
            Agent Memory Files
            <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 400 }}>({agentFiles.length})</span>
          </div>
          {agentFiles.map(file => (
            <div key={file.name} className="memory-file">
              <div className="memory-file-header" onClick={() => toggle(file.name)}>
                <h3>
                  <span style={{ color: "var(--accent)", marginRight: 8 }}>{expanded[file.name] ? "▼" : "▶"}</span>
                  {file.name}
                  <span style={{ marginLeft: 8, fontSize: 11, color: "var(--text-muted)", textTransform: "lowercase" }}>
                    ({file.agent})
                  </span>
                </h3>
                <span>{formatSize(file.size)} · {formatDate(file.updated_at)}</span>
              </div>
              {expanded[file.name] && (
                <div className="memory-file-content">
                  {file.content || "(empty)"}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {systemFiles.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-muted)", marginBottom: 12 }}>
            System Files
            <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 400 }}>({systemFiles.length})</span>
          </div>
          {systemFiles.map(file => (
            <div key={file.name} className="memory-file">
              <div className="memory-file-header" onClick={() => toggle(file.name)}>
                <h3>
                  <span style={{ color: "var(--accent)", marginRight: 8 }}>{expanded[file.name] ? "▼" : "▶"}</span>
                  {file.name}
                </h3>
                <span>{formatSize(file.size)} · {formatDate(file.updated_at)}</span>
              </div>
              {expanded[file.name] && (
                <div className="memory-file-content">
                  {file.content || "(empty)"}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
