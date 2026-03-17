"use client";
import { useState, useEffect } from "react";

export default function MemoryPage() {
  const [files, setFiles] = useState([]);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/memory")
      .then(r => r.json())
      .then(d => { setFiles(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

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

      {!loading && filtered.length === 0 && (
        <div className="empty">
          {search ? "No files match your search" : "No memory files found"}
        </div>
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
