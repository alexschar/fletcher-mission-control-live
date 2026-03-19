"use client";

import { useEffect, useState } from "react";

const AGENTS = ["sawyer", "celeste", "fletcher"];

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

export default function ContentDetail({ item, onClose, onSave }) {
  const [summary, setSummary] = useState("");
  const [topicsText, setTopicsText] = useState("");
  const [relevantAgents, setRelevantAgents] = useState([]);
  const [processed, setProcessed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!item) return;
    setSummary(item.summary || "");
    setTopicsText(normalizeArray(item.topics).join(", "));
    setRelevantAgents(normalizeArray(item.relevant_agents));
    setProcessed(!!item.processed);
    setError("");
  }, [item]);

  if (!item) return null;

  async function handleSave(nextProcessed = processed) {
    setSaving(true);
    setError("");
    try {
      const payload = {
        summary,
        topics: topicsText
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        relevant_agents: relevantAgents,
        processed: nextProcessed,
      };
      await onSave?.(payload);
      setProcessed(nextProcessed);
    } catch (err) {
      setError(err.message || "Failed to save content");
    } finally {
      setSaving(false);
    }
  }

  function toggleAgent(agent) {
    setRelevantAgents((current) => (
      current.includes(agent)
        ? current.filter((entry) => entry !== agent)
        : [...current, agent]
    ));
  }

  return (
    <div className="content-overlay" onClick={onClose}>
      <div className="content-panel" onClick={(event) => event.stopPropagation()}>
        <div className="content-panel-header">
          <div>
            <div className="content-panel-kicker">Content Detail</div>
            <h2>{item.title || "Untitled drop"}</h2>
          </div>
          <button className="btn" onClick={onClose}>Close</button>
        </div>

        <div className="content-panel-section">
          <div className="field-label">Platform</div>
          <div>{item.platform || "other"}</div>
        </div>

        <div className="content-panel-section">
          <div className="field-label">Source URL</div>
          {item.source_url ? (
            <a href={item.source_url} target="_blank" rel="noreferrer">{item.source_url}</a>
          ) : (
            <div>—</div>
          )}
        </div>

        <div className="content-panel-section">
          <div className="field-label">Raw content</div>
          <div className="content-raw-box">{item.raw_content || "No raw content"}</div>
        </div>

        <div className="content-panel-section">
          <div className="field-label">Summary</div>
          <textarea
            className="input content-textarea"
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            placeholder="Add a concise summary"
          />
        </div>

        <div className="content-panel-section">
          <div className="field-label">Topics</div>
          <input
            className="input"
            value={topicsText}
            onChange={(event) => setTopicsText(event.target.value)}
            placeholder="automation, product, growth"
          />
        </div>

        <div className="content-panel-section">
          <div className="field-label">Relevant agents</div>
          <div className="content-agent-grid">
            {AGENTS.map((agent) => (
              <label key={agent} className="content-checkbox-row">
                <input
                  type="checkbox"
                  checked={relevantAgents.includes(agent)}
                  onChange={() => toggleAgent(agent)}
                />
                <span>{agent}</span>
              </label>
            ))}
          </div>
        </div>

        {error ? <div className="content-error">{error}</div> : null}

        <div className="content-panel-footer">
          <button
            className="btn"
            onClick={() => handleSave(!processed)}
            disabled={saving}
          >
            Mark {processed ? "unprocessed" : "processed"}
          </button>
          <div className="content-panel-actions">
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={() => handleSave(processed)} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
