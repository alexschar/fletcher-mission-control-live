"use client";
import { useState, useEffect } from "react";
import { getAuthHeaders, isAuthenticated, logout } from "../../lib/api-client";
import { useRouter } from "next/navigation";

export default function MemoryPage() {
  const [files, setFiles] = useState([]);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetch("/api/memory", { headers: getAuthHeaders() })
      .then(r => r.ok ? r.json() : (r.status === 401 ? (logout(), router.push('/login')) : []))
      .then(d => { setFiles(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [router]);

  function toggle(name) {
    setExpanded(prev => ({ ...prev, [name]: !prev[name] }));
  }

  const filtered = files.filter(f => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return f.name.toLowerCase().includes(q) || (f.content && f.content.toLowerCase().includes(q));
  });

  const workspaceFiles = filtered.filter(f => f.path === "workspace");
  const memoryFiles = filtered.filter(f => f.path === "memory");

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

      <div className="search-bar">
        <input
          className="input"
          placeholder="Search files and content..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading && <div className="empty">Loading memory files...</div>}

      {!loading && filtered.length === 0 && !search && (
        <div className="empty">
          <p>Memory files are not available in the cloud deployment.</p>
          <p style={{ fontSize: 12, marginTop: 8, color: "var(--text-muted)" }}>
            Memory files are stored locally on the Mac mini and accessible only in development.
          </p>
        </div>
      )}
      {!loading && filtered.length === 0 && search && (
        <div className="empty">No files match your search</div>
      )}

      {workspaceFiles.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-muted)", marginBottom: 12 }}>
            Workspace Files
            <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 400 }}>({workspaceFiles.length})</span>
          </div>
          {workspaceFiles.map(file => (
            <div key={file.name} className="memory-file">
              <div className="memory-file-header" onClick={() => toggle(file.name)}>
                <h3>
                  <span style={{ color: "var(--accent)", marginRight: 8 }}>{expanded[file.name] ? "▼" : "▶"}</span>
                  {file.name}
                </h3>
                <span>{formatSize(file.size)} · {formatDate(file.modified)}</span>
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

      {memoryFiles.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-muted)", marginBottom: 12 }}>
            Daily Memory Logs
            <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 400 }}>({memoryFiles.length})</span>
          </div>
          {memoryFiles.map(file => (
            <div key={file.name} className="memory-file">
              <div className="memory-file-header" onClick={() => toggle(file.name)}>
                <h3>
                  <span style={{ color: "var(--accent)", marginRight: 8 }}>{expanded[file.name] ? "▼" : "▶"}</span>
                  {file.name}
                </h3>
                <span>{formatSize(file.size)} · {formatDate(file.modified)}</span>
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
